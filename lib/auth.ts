import 'server-only'
import { cookies } from 'next/headers'
import { randomUUID, pbkdf2Sync, randomBytes, createHmac } from 'crypto'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import { eq } from 'drizzle-orm'
import { getDb } from '@/lib/db/connection'
import { user as userTable } from '@/lib/db/schema'
import { MASTER_ADMIN_EMAIL, getDefaultPermissions } from '@/lib/permissions'
import type { UserRole, AdminRank, Permission } from '@/lib/permissions'

export interface AuthUser {
  id: string
  name: string
  email: string
  isAdmin: boolean
  role: UserRole
  rank?: AdminRank
  title?: string
  username?: string
  phone?: string
  showFullName: boolean
  permissions: Permission[]
}


interface StoredUser {
  id: string
  name: string
  email: string
  passwordHash: string
  isAdmin: boolean
  role: UserRole
  rank?: AdminRank
  title?: string
  username?: string
  phone?: string
  showFullName: boolean
  permissions: Permission[]
}

interface AuthStore {
  users: Map<string, StoredUser>
  emailIndex: Map<string, string>
  resetTokens: Map<string, { email: string; exp: number }>
  verificationTokens: Map<string, { email: string; exp: number }>
}

declare global {
  var __authStore: AuthStore | undefined
}

function getSecret(): string {
  const secret = process.env.AUTH_SECRET
  if (!secret) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[auth] AUTH_SECRET not set — using development fallback')
      return createHmac('sha256', 'dev-fallback').update(process.cwd()).digest('hex')
    }
    throw new Error(
      'AUTH_SECRET is not configured. Go to Vercel Dashboard → Settings → Environment Variables and add AUTH_SECRET from your .env.local file.'
    )
  }
  return secret
}

function getDataDir(): string {
  return join(process.cwd(), 'data')
}

function getUsersFile(): string {
  return join(getDataDir(), 'users.json')
}

function loadStore(): AuthStore {
  const store: AuthStore = {
    users: new Map(),
    emailIndex: new Map(),
    resetTokens: new Map(),
    verificationTokens: new Map(),
  }

  try {
    const file = getUsersFile()
    if (existsSync(file)) {
      const raw = readFileSync(file, 'utf-8')
      const data = JSON.parse(raw)
      if (Array.isArray(data.users)) {
        for (const u of data.users) {
          store.users.set(u.id, u)
          store.emailIndex.set(u.email, u.id)
        }
      }
      if (Array.isArray(data.resetTokens)) {
        for (const t of data.resetTokens) {
          store.resetTokens.set(t.token, { email: t.email, exp: t.exp })
        }
      }
      if (Array.isArray(data.verificationTokens)) {
        for (const t of data.verificationTokens) {
          store.verificationTokens.set(t.token, { email: t.email, exp: t.exp })
        }
      }
    }
  } catch {
    // corrupt file, start fresh
  }

  return store
}

function saveStore(store: AuthStore): void {
  try {
    const dir = getDataDir()
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }
    const data = {
      users: Array.from(store.users.values()),
      resetTokens: Array.from(store.resetTokens.entries()).map(([token, value]) => ({
        token,
        email: value.email,
        exp: value.exp,
      })),
      verificationTokens: Array.from(store.verificationTokens.entries()).map(([token, value]) => ({
        token,
        email: value.email,
        exp: value.exp,
      })),
    }
    writeFileSync(getUsersFile(), JSON.stringify(data, null, 2), 'utf-8')
  } catch {
    // silently fail – data is still in memory
  }
}

function getStore(): AuthStore {
  if (!globalThis.__authStore) {
    globalThis.__authStore = loadStore()
    seedAdminUser(globalThis.__authStore)
  }
  return globalThis.__authStore
}

function persistStore(): void {
  saveStore(getStore())
}

function hashPassword(password: string): string {
  const salt = randomBytes(16)
  const key = pbkdf2Sync(password, salt, 100000, 32, 'sha256')
  return `${salt.toString('hex')}:${key.toString('hex')}`
}

function verifyPassword(password: string, stored: string): boolean {
  const [saltHex, keyHex] = stored.split(':')
  const salt = Buffer.from(saltHex, 'hex')
  const key = pbkdf2Sync(password, salt, 100000, 32, 'sha256')
  return key.toString('hex') === keyHex
}

function signToken(payload: Record<string, unknown>): string {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const sig = createHmac('sha256', getSecret()).update(data).digest('base64url')
  return `${data}.${sig}`
}

function verifyToken(token: string): Record<string, unknown> | null {
  const parts = token.split('.')
  if (parts.length !== 2) return null
  const [data, sig] = parts
  const expectedSig = createHmac('sha256', getSecret()).update(data).digest('base64url')
  if (sig !== expectedSig) return null
  try {
    return JSON.parse(Buffer.from(data, 'base64url').toString('utf-8'))
  } catch {
    return null
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function validateEmail(email: string): string | null {
  if (!email || typeof email !== 'string') return 'Email is required'
  const trimmed = email.trim()
  if (!trimmed) return 'Email is required'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return 'Invalid email format'
  return null
}

export function validatePassword(password: string): string | null {
  if (!password) return 'Password is required'
  if (password.length < 8) return 'Password must be at least 8 characters'
  if (password.length > 128) return 'Password must be at most 128 characters'
  return null
}

export function validateName(name: string): string | null {
  if (!name || typeof name !== 'string') return 'Name is required'
  const trimmed = name.trim()
  if (!trimmed) return 'Name is required'
  if (trimmed.length < 1) return 'Name is required'
  if (trimmed.length > 100) return 'Name must be at most 100 characters'
  return null
}

export async function createUser(
  name: string,
  email: string,
  password: string,
  isAdmin = false,
  role: UserRole = 'user',
  rank?: AdminRank,
  title?: string,
): Promise<{ id: string; name: string; email: string }> {
  const normalizedEmail = normalizeEmail(email)
  const db = getDb()

  if (db) {
    const existing = await db.select({ id: userTable.id })
      .from(userTable)
      .where(eq(userTable.email, normalizedEmail))
      .limit(1)

    if (existing.length > 0) {
      throw new Error('An account with this email already exists')
    }

    const id = randomUUID()
    const passwordHash = hashPassword(password)
    await db.insert(userTable).values({
      id,
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      isAdmin,
    })

    return { id, name: name.trim(), email: normalizedEmail }
  }

  // Fall back to in-memory
  const store = getStore()

  if (store.emailIndex.has(normalizedEmail)) {
    throw new Error('An account with this email already exists')
  }

  const id = randomUUID()
  const passwordHash = hashPassword(password)
  const user: StoredUser = {
    id,
    name: name.trim(),
    email: normalizedEmail,
    passwordHash,
    isAdmin,
    role,
    rank: rank ?? (isAdmin ? (role === 'master_admin' ? 'master' : 'junior') : undefined),
    title,
    showFullName: false,
    permissions: getDefaultPermissions(role as UserRole),
  }

  store.users.set(id, user)
  store.emailIndex.set(normalizedEmail, id)
  persistStore()

  return { id, name: user.name, email: normalizedEmail }
}

export async function authenticateUser(
  email: string,
  password: string,
): Promise<{ id: string; name: string; email: string; isAdmin: boolean; role: UserRole; rank?: AdminRank; title?: string; permissions: Permission[] } | null> {
  const normalizedEmail = normalizeEmail(email)
  const db = getDb()

  if (db) {
    const rows = await db.select({
      id: userTable.id,
      name: userTable.name,
      email: userTable.email,
      passwordHash: userTable.passwordHash,
      isAdmin: userTable.isAdmin,
    })
      .from(userTable)
      .where(eq(userTable.email, normalizedEmail))
      .limit(1)

    if (rows.length === 0) return null

    const user = rows[0]
    if (!user.passwordHash) return null

    const valid = verifyPassword(password, user.passwordHash)
    if (!valid) return null

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin ?? false,
      role: user.isAdmin ? 'master_admin' : 'user',
      permissions: [],
    }
  }

  // Fall back to in-memory
  const store = getStore()
  const userId = store.emailIndex.get(normalizedEmail)
  if (!userId) return null

  const user = store.users.get(userId)
  if (!user) return null

  const valid = verifyPassword(password, user.passwordHash)
  if (!valid) return null

  return { id: user.id, name: user.name, email: user.email, isAdmin: user.isAdmin, role: user.role, rank: user.rank, title: user.title, permissions: user.permissions }
}

export async function createSession(userId: string): Promise<string> {
  const db = getDb()

  if (db) {
    const rows = await db.select({
      id: userTable.id,
      name: userTable.name,
      email: userTable.email,
      isAdmin: userTable.isAdmin,
    })
      .from(userTable)
      .where(eq(userTable.id, userId))
      .limit(1)

    if (rows.length === 0) throw new Error('User not found')
    const u = rows[0]

    return signToken({
      userId: u.id,
      name: u.name,
      email: u.email,
      isAdmin: u.isAdmin ?? false,
      role: u.isAdmin ? 'master_admin' : 'user',
      permissions: [],
      exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
    })
  }

  // Fall back to in-memory
  const store = getStore()
  const user = store.users.get(userId)
  if (!user) throw new Error('User not found')

  return signToken({
    userId: user.id,
    name: user.name,
    email: user.email,
    isAdmin: user.isAdmin,
    role: user.role,
    rank: user.rank,
    title: user.title,
    permissions: user.permissions,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
  })
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) return null

  const payload = verifyToken(token)
  if (!payload) return null

  const exp = payload.exp as number
  if (exp < Date.now()) return null

  const userId = payload.userId as string

  const db = getDb()
  if (db) {
    const rows = await db.select({
      id: userTable.id,
      name: userTable.name,
      email: userTable.email,
      isAdmin: userTable.isAdmin,
      username: userTable.username,
      phone: userTable.phone,
      showFullName: userTable.showFullName,
    })
      .from(userTable)
      .where(eq(userTable.id, userId))
      .limit(1)

    if (rows.length === 0) return null
    const u = rows[0]
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      isAdmin: u.isAdmin ?? false,
      role: u.isAdmin ? 'master_admin' : 'user',
      username: u.username ?? undefined,
      phone: u.phone ?? undefined,
      showFullName: u.showFullName ?? false,
      permissions: [],
    }
  }

  const store = getStore()
  const user = store.users.get(userId)
  if (!user) return null

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    isAdmin: user.isAdmin,
    role: user.role,
    rank: user.rank,
    title: user.title,
    username: user.username,
    phone: user.phone,
    showFullName: user.showFullName ?? false,
    permissions: user.permissions,
  }
}

export async function deleteSession(): Promise<void> {
  // cookie-based, nothing to clear server-side
}

export function generateResetToken(email: string): string {
  return signToken({
    type: 'reset',
    email: normalizeEmail(email),
    exp: Date.now() + 60 * 60 * 1000,
  })
}

export function verifyResetToken(token: string): string | null {
  const payload = verifyToken(token)
  if (!payload) return null
  if (payload.type !== 'reset') return null
  const exp = payload.exp as number
  if (exp < Date.now()) return null
  return payload.email as string
}

export async function updatePassword(email: string, newPassword: string): Promise<boolean> {
  const normalizedEmail = normalizeEmail(email)
  const db = getDb()

  if (db) {
    const passwordHash = hashPassword(newPassword)
    await db.update(userTable)
      .set({ passwordHash })
      .where(eq(userTable.email, normalizedEmail))
    return true
  }

  // Fall back to in-memory
  const store = getStore()
  const userId = store.emailIndex.get(normalizedEmail)
  if (!userId) return false

  const user = store.users.get(userId)
  if (!user) return false

  user.passwordHash = hashPassword(newPassword)
  persistStore()
  return true
}

export async function updateUser(
  userId: string,
  updates: { name?: string; email?: string; username?: string; phone?: string; showFullName?: boolean }
): Promise<boolean> {
  const normalizedEmail = updates.email ? normalizeEmail(updates.email) : undefined
  const db = getDb()

  if (db) {
    const setValues: Record<string, unknown> = {}
    if (updates.name) setValues.name = updates.name.trim()
    if (updates.email) setValues.email = normalizedEmail
    if (updates.username !== undefined) setValues.username = updates.username || null
    if (updates.phone !== undefined) setValues.phone = updates.phone || null
    if (updates.showFullName !== undefined) setValues.showFullName = updates.showFullName

    if (Object.keys(setValues).length === 0) return true

    await db.update(userTable).set(setValues).where(eq(userTable.id, userId))
    return true
  }

  const store = getStore()
  const user = store.users.get(userId)
  if (!user) return false

  if (updates.name) user.name = updates.name.trim()
  if (updates.email) user.email = normalizedEmail!
  if (updates.username !== undefined) user.username = updates.username || undefined
  if (updates.phone !== undefined) user.phone = updates.phone || undefined
  if (updates.showFullName !== undefined) user.showFullName = updates.showFullName
  persistStore()
  return true
}

export function generateEmailVerificationToken(email: string): string {
  return signToken({
    type: 'verify',
    email: normalizeEmail(email),
    exp: Date.now() + 24 * 60 * 60 * 1000,
  })
}

export function verifyEmailToken(token: string): string | null {
  const payload = verifyToken(token)
  if (!payload) return null
  if (payload.type !== 'verify') return null
  const exp = payload.exp as number
  if (exp < Date.now()) return null
  return payload.email as string
}

export async function markEmailVerified(email: string): Promise<void> {
  const normalizedEmail = normalizeEmail(email)
  const db = getDb()

  if (db) {
    await db.update(userTable)
      .set({ emailVerified: true })
      .where(eq(userTable.email, normalizedEmail))
    return
  }

  const store = getStore()
  const userId = store.emailIndex.get(normalizedEmail)
  if (!userId) return
  const user = store.users.get(userId)
  if (user) {
    ;(user as unknown as Record<string, unknown>).emailVerified = true
    persistStore()
  }
}

export async function getUserNameByEmail(email: string): Promise<string | null> {
  const normalizedEmail = normalizeEmail(email)
  const db = getDb()

  if (db) {
    const rows = await db.select({ name: userTable.name })
      .from(userTable)
      .where(eq(userTable.email, normalizedEmail))
      .limit(1)
    if (rows.length === 0) return null
    return rows[0].name
  }

  const store = getStore()
  const userId = store.emailIndex.get(normalizedEmail)
  if (!userId) return null
  const user = store.users.get(userId)
  return user?.name ?? null
}

export async function isEmailVerified(email: string): Promise<boolean> {
  const normalizedEmail = normalizeEmail(email)
  const db = getDb()

  if (db) {
    const rows = await db.select({ emailVerified: userTable.emailVerified })
      .from(userTable)
      .where(eq(userTable.email, normalizedEmail))
      .limit(1)
    if (rows.length === 0) return false
    return rows[0].emailVerified ?? false
  }

  return true
}

function getAdminEmail(): string {
  return process.env.ADMIN_EMAIL || MASTER_ADMIN_EMAIL
}

function getAdminPassword(): string {
  return process.env.ADMIN_PASSWORD || 'Admin@123'
}

function seedAdminUser(store: AuthStore): void {
  const adminEmail = getAdminEmail()
  const normalizedEmail = normalizeEmail(adminEmail)
  const existingUserId = store.emailIndex.get(normalizedEmail)

  const passwordHash = hashPassword(getAdminPassword())

  if (existingUserId) {
    const existing = store.users.get(existingUserId)
    if (existing) {
      existing.passwordHash = passwordHash
      existing.isAdmin = true
      existing.role = 'master_admin'
      existing.rank = 'master'
      existing.title = 'Master Admin'
      existing.permissions = getDefaultPermissions('master_admin')
      saveStore(store)
      return
    }
  }

  const id = randomUUID()
  const user: StoredUser = {
    id,
    name: 'Admin',
    email: normalizedEmail,
    passwordHash,
    isAdmin: true,
    role: 'master_admin',
    rank: 'master',
    title: 'Master Admin',
    showFullName: false,
    permissions: getDefaultPermissions('master_admin'),
  }
  store.users.set(id, user)
  store.emailIndex.set(normalizedEmail, id)
  saveStore(store)
}

let _seedingDbAdmin = false

export async function seedDbAdmin(): Promise<void> {
  if (_seedingDbAdmin) return
  _seedingDbAdmin = true

  try {
    const db = getDb()
    if (!db) return

    const adminEmail = getAdminEmail()
    const normalizedEmail = normalizeEmail(adminEmail)
    const existing = await db.select({ id: userTable.id, isAdmin: userTable.isAdmin })
      .from(userTable)
      .where(eq(userTable.email, normalizedEmail))
      .limit(1)

    const passwordHash = hashPassword(getAdminPassword())

    if (existing.length > 0) {
      await db.update(userTable)
        .set({ isAdmin: true, passwordHash })
        .where(eq(userTable.email, normalizedEmail))
      return
    }

    const id = randomUUID()
    await db.insert(userTable).values({
      id,
      name: 'Admin',
      email: normalizedEmail,
      passwordHash,
      isAdmin: true,
    }).catch(() => {
      // Race condition: another instance seeded first, that is fine
    })
    console.log(`[auth] Created admin user ${adminEmail} in DB`)
  } finally {
    _seedingDbAdmin = false
  }
}

export async function requireAdmin(): Promise<AuthUser> {
  const user = await getCurrentUser()
  if (!user || !user.isAdmin) {
    throw new Error('Unauthorized: admin access required')
  }
  return user
}

export async function requireMasterAdmin(): Promise<AuthUser> {
  const user = await getCurrentUser()
  if (!user || user.role !== 'master_admin') {
    throw new Error('Unauthorized: master admin access required')
  }
  return user
}

export async function getAdminUser(): Promise<AuthUser | null> {
  const user = await getCurrentUser()
  if (!user || !user.isAdmin) return null
  return user
}

/* ─── Admin user management ──────────────────────────────────────────── */

export function getUsersStore() {
  return getStore()
}

export function saveUsersStore(): void {
  persistStore()
}

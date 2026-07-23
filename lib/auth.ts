import 'server-only'
import { cookies } from 'next/headers'
import { randomUUID, pbkdf2Sync, randomBytes, createHmac, timingSafeEqual } from 'crypto'
import { eq, sql } from 'drizzle-orm'
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

function hashPassword(password: string): string {
  const salt = randomBytes(16)
  const key = pbkdf2Sync(password, salt, 100000, 32, 'sha256')
  return `${salt.toString('hex')}:${key.toString('hex')}`
}

function verifyPassword(password: string, stored: string): boolean {
  const [saltHex, keyHex] = stored.split(':')
  const salt = Buffer.from(saltHex, 'hex')
  const key = pbkdf2Sync(password, salt, 100000, 32, 'sha256')
  const expected = Buffer.from(keyHex, 'hex')
  if (key.length !== expected.length) return false
  return timingSafeEqual(key, expected)
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
  const sigBuf = Buffer.from(sig)
  const expectedBuf = Buffer.from(expectedSig)
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) return null
  try {
    return JSON.parse(Buffer.from(data, 'base64url').toString('utf-8'))
  } catch {
    return null
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function serializePermissions(permissions: Permission[] | undefined): string {
  return JSON.stringify(Array.isArray(permissions) ? permissions : [])
}

function parsePermissions(raw: unknown): Permission[] {
  if (Array.isArray(raw)) return raw as Permission[]
  if (typeof raw === 'string' && raw.length > 0) {
    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? (parsed as Permission[]) : []
    } catch {
      return []
    }
  }
  return []
}

function mapDbUser(u: {
  id: string
  name: string
  email: string
  passwordHash?: string | null
  isAdmin: boolean | null
  role?: string | null
  rank?: string | null
  title?: string | null
  username?: string | null
  phone?: string | null
  showFullName?: boolean | null
  permissions?: unknown
  tokenVersion?: number | null
}): AuthUser {
  const role = (u.role as UserRole) || (u.isAdmin ? 'master_admin' : 'user')
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    isAdmin: u.isAdmin ?? false,
    role,
    rank: u.rank as AdminRank | undefined,
    title: u.title ?? undefined,
    username: u.username ?? undefined,
    phone: u.phone ?? undefined,
    showFullName: u.showFullName ?? false,
    permissions: parsePermissions(u.permissions),
  }
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
  const db = await getDb()
  if (!db) throw new Error('Database not available')

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
    role,
    rank: rank ?? (isAdmin ? (role === 'master_admin' ? 'master' : 'junior') : undefined),
    title: title ?? (isAdmin ? (role === 'master_admin' ? 'Master Admin' : undefined) : undefined),
    permissions: serializePermissions(getDefaultPermissions(role)),
    tokenVersion: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  })

  return { id, name: name.trim(), email: normalizedEmail }
}

export async function authenticateUser(
  email: string,
  password: string,
): Promise<{ id: string; name: string; email: string; isAdmin: boolean; role: UserRole; rank?: AdminRank; title?: string; permissions: Permission[] } | null> {
  const normalizedEmail = normalizeEmail(email)
  const db = await getDb()
  if (!db) return null

  const rows = await db.select({
    id: userTable.id,
    name: userTable.name,
    email: userTable.email,
    passwordHash: userTable.passwordHash,
    isAdmin: userTable.isAdmin,
    role: userTable.role,
    rank: userTable.rank,
    title: userTable.title,
    permissions: userTable.permissions,
    tokenVersion: userTable.tokenVersion,
  })
    .from(userTable)
    .where(eq(userTable.email, normalizedEmail))
    .limit(1)

  if (rows.length === 0) return null
  const user = rows[0]
  if (!user.passwordHash) return null

  const valid = verifyPassword(password, user.passwordHash)
  if (!valid) return null

  const role = (user.role as UserRole) || (user.isAdmin ? 'master_admin' : 'user')
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    isAdmin: user.isAdmin ?? false,
    role,
    rank: user.rank as AdminRank | undefined,
    title: user.title ?? undefined,
    permissions: parsePermissions(user.permissions),
  }
}

export async function createSession(userId: string): Promise<string> {
  const db = await getDb()
  if (!db) throw new Error('Database not available')

  const rows = await db.select({
    id: userTable.id,
    name: userTable.name,
    email: userTable.email,
    isAdmin: userTable.isAdmin,
    role: userTable.role,
    rank: userTable.rank,
    title: userTable.title,
    permissions: userTable.permissions,
    tokenVersion: userTable.tokenVersion,
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
    role: (u.role as UserRole) || (u.isAdmin ? 'master_admin' : 'user'),
    rank: u.rank,
    title: u.title,
    permissions: parsePermissions(u.permissions),
    tokenVersion: u.tokenVersion ?? 0,
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
  const jwtTokenVersion = (payload.tokenVersion as number) ?? 0

  const db = await getDb()
  if (!db) return null

  const rows = await db.select({
    id: userTable.id,
    name: userTable.name,
    email: userTable.email,
    isAdmin: userTable.isAdmin,
    username: userTable.username,
    phone: userTable.phone,
    showFullName: userTable.showFullName,
    role: userTable.role,
    rank: userTable.rank,
    title: userTable.title,
    permissions: userTable.permissions,
    tokenVersion: userTable.tokenVersion,
  })
    .from(userTable)
    .where(eq(userTable.id, userId))
    .limit(1)

  if (rows.length === 0) return null
  const u = rows[0]

  if ((u.tokenVersion ?? 0) !== jwtTokenVersion) return null

  return mapDbUser(u)
}

export async function deleteSession(): Promise<void> {
  // Cookie is cleared by the route handler.
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
  const db = await getDb()
  if (!db) return false

  const passwordHash = hashPassword(newPassword)
  await db.update(userTable)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(userTable.email, normalizedEmail))
  return true
}

export async function updateUser(
  userId: string,
  updates: { name?: string; email?: string; username?: string; phone?: string; showFullName?: boolean }
): Promise<boolean> {
  const normalizedEmail = updates.email ? normalizeEmail(updates.email) : undefined
  const db = await getDb()
  if (!db) return false

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
  const db = await getDb()
  if (!db) return

  await db.update(userTable)
    .set({ emailVerified: true, updatedAt: new Date() })
    .where(eq(userTable.email, normalizedEmail))
}

export async function getUserNameByEmail(email: string): Promise<string | null> {
  const normalizedEmail = normalizeEmail(email)
  const db = await getDb()
  if (!db) return null

  const rows = await db.select({ name: userTable.name })
    .from(userTable)
    .where(eq(userTable.email, normalizedEmail))
    .limit(1)
  return rows.length > 0 ? rows[0].name : null
}

export async function emailExists(email: string): Promise<boolean> {
  const db = await getDb()
  if (!db) return false

  const rows = await db.select({ id: userTable.id })
    .from(userTable)
    .where(eq(userTable.email, normalizeEmail(email)))
    .limit(1)
  return rows.length > 0
}

export async function isEmailVerified(email: string): Promise<boolean> {
  const normalizedEmail = normalizeEmail(email)
  const db = await getDb()
  if (!db) return false

  const rows = await db.select({ emailVerified: userTable.emailVerified })
    .from(userTable)
    .where(eq(userTable.email, normalizedEmail))
    .limit(1)
  return rows.length > 0 ? (rows[0].emailVerified ?? false) : false
}

function getAdminEmail(): string {
  return process.env.ADMIN_EMAIL || MASTER_ADMIN_EMAIL
}

function getAdminPassword(): string {
  return process.env.ADMIN_PASSWORD || 'Admin@123'
}

let _seedingDbAdmin = false

export async function seedDbAdmin(): Promise<void> {
  if (_seedingDbAdmin) return
  _seedingDbAdmin = true

  try {
    const db = await getDb()
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
        .set({
          isAdmin: true,
          passwordHash,
          role: 'master_admin',
          rank: 'master',
          title: 'Master Admin',
          permissions: serializePermissions(getDefaultPermissions('master_admin')),
          updatedAt: new Date(),
        })
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
      role: 'master_admin',
      rank: 'master',
      title: 'Master Admin',
      permissions: serializePermissions(getDefaultPermissions('master_admin')),
      tokenVersion: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
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

export interface AdminUserListItem {
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

export interface AdminUserUpdate {
  role?: UserRole
  rank?: AdminRank
  title?: string
  permissions?: Permission[]
}

export async function listAllUsers(): Promise<AdminUserListItem[]> {
  const db = await getDb()
  if (!db) return []

  const rows = await db.select({
    id: userTable.id,
    name: userTable.name,
    email: userTable.email,
    isAdmin: userTable.isAdmin,
    role: userTable.role,
    rank: userTable.rank,
    title: userTable.title,
    username: userTable.username,
    phone: userTable.phone,
    showFullName: userTable.showFullName,
    permissions: userTable.permissions,
  }).from(userTable)
  return rows.map(mapDbUser)
}

export async function getUserById(id: string): Promise<AdminUserListItem | null> {
  const db = await getDb()
  if (!db) return null

  const rows = await db.select({
    id: userTable.id,
    name: userTable.name,
    email: userTable.email,
    isAdmin: userTable.isAdmin,
    role: userTable.role,
    rank: userTable.rank,
    title: userTable.title,
    username: userTable.username,
    phone: userTable.phone,
    showFullName: userTable.showFullName,
    permissions: userTable.permissions,
  })
    .from(userTable)
    .where(eq(userTable.id, id))
    .limit(1)

  return rows.length > 0 ? mapDbUser(rows[0]) : null
}

export async function setUserAdmin(id: string, updates: AdminUserUpdate): Promise<AdminUserListItem> {
  const db = await getDb()
  if (!db) throw new Error('Database not available')

  const existing = await db.select({ id: userTable.id, role: userTable.role })
    .from(userTable)
    .where(eq(userTable.id, id))
    .limit(1)
  if (existing.length === 0) throw new Error('User not found')

  const setValues: Record<string, unknown> = {}
  if (updates.role !== undefined) {
    setValues.role = updates.role
    setValues.isAdmin = updates.role === 'admin' || updates.role === 'master_admin'
  }
  if (updates.rank !== undefined) setValues.rank = updates.rank
  if (updates.title !== undefined) setValues.title = updates.title || null
  if (updates.permissions !== undefined) setValues.permissions = serializePermissions(updates.permissions)
  setValues.tokenVersion = sql`${userTable.tokenVersion} + 1`

  if (Object.keys(setValues).length > 0) {
    setValues.updatedAt = new Date()
    await db.update(userTable).set(setValues).where(eq(userTable.id, id))
  }
  const updated = await getUserById(id)
  if (!updated) throw new Error('User not found')
  return updated
}

export async function demoteUserToRegular(id: string): Promise<void> {
  await setUserAdmin(id, {
    role: 'user',
    rank: undefined,
    title: undefined,
    permissions: [],
  })
}

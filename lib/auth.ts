import 'server-only'

import { cookies } from 'next/headers'
import { createHmac, pbkdf2Sync, randomBytes, randomUUID, timingSafeEqual } from 'crypto'
import { eq, sql } from 'drizzle-orm'
import { getDb } from '@/lib/db/connection'
import { user as userTable } from '@/lib/db/schema'
import { MASTER_ADMIN_EMAIL, getDefaultPermissions } from '@/lib/permissions'
import type { AdminRank, Permission, UserRole } from '@/lib/permissions'

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

type DbUser = typeof userTable.$inferSelect

function getSecret(): string {
  const secret = process.env.AUTH_SECRET
  if (!secret) {
    if (process.env.NODE_ENV !== 'production') {
      return createHmac('sha256', 'dev-fallback').update(process.cwd()).digest('hex')
    }
    throw new Error('AUTH_SECRET is not configured')
  }
  return secret
}

function hashPassword(password: string): string {
  const salt = randomBytes(16)
  const key = pbkdf2Sync(password, salt, 100000, 32, 'sha256')
  return `${salt.toString('hex')}:${key.toString('hex')}`
}

function verifyPassword(password: string, stored: string): boolean {
  try {
    const [saltHex, keyHex] = stored.split(':')
    if (!saltHex || !keyHex) return false
    const salt = Buffer.from(saltHex, 'hex')
    const key = pbkdf2Sync(password, salt, 100000, 32, 'sha256')
    const expected = Buffer.from(keyHex, 'hex')
    return key.length === expected.length && timingSafeEqual(key, expected)
  } catch {
    return false
  }
}

function signToken(payload: Record<string, unknown>): string {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signature = createHmac('sha256', getSecret()).update(data).digest('base64url')
  return `${data}.${signature}`
}

function verifyToken(token: string): Record<string, unknown> | null {
  const parts = token.split('.')
  if (parts.length !== 2) return null

  const [data, signature] = parts
  const expected = createHmac('sha256', getSecret()).update(data).digest('base64url')
  const actualBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expected)

  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) {
    return null
  }

  try {
    return JSON.parse(Buffer.from(data, 'base64url').toString()) as Record<string, unknown>
  } catch {
    return null
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function serializePermissions(permissions?: Permission[]): string {
  return JSON.stringify(Array.isArray(permissions) ? permissions : [])
}

function parsePermissions(raw: unknown): Permission[] {
  if (Array.isArray(raw)) return raw as Permission[]
  if (typeof raw !== 'string' || !raw) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as Permission[]) : []
  } catch {
    return []
  }
}

function mapDbUser(user: DbUser): AuthUser {
  const role = (user.role as UserRole) || (user.isAdmin ? 'master_admin' : 'user')
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    isAdmin: user.isAdmin ?? false,
    role,
    rank: user.rank ?? undefined,
    title: user.title ?? undefined,
    username: user.username ?? undefined,
    phone: user.phone ?? undefined,
    showFullName: user.showFullName ?? false,
    permissions: parsePermissions(user.permissions),
  }
}

export function validateEmail(email: string): string | null {
  if (!email || typeof email !== 'string') return 'Email is required'
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ? null : 'Invalid email format'
}

export function validatePassword(password: string): string | null {
  if (!password) return 'Password is required'
  if (password.length < 8) return 'Password must be at least 8 characters'
  if (password.length > 128) return 'Password must be at most 128 characters'
  return null
}

export function validateName(name: string): string | null {
  if (!name || typeof name !== 'string' || !name.trim()) return 'Name is required'
  if (name.trim().length > 100) return 'Name must be at most 100 characters'
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
  const db = await getDb()
  if (!db) throw new Error('Database not available')

  const normalizedEmail = normalizeEmail(email)
  const existing = await db.select({ id: userTable.id })
    .from(userTable)
    .where(eq(userTable.email, normalizedEmail))
    .limit(1)

  if (existing.length > 0) throw new Error('An account with this email already exists')

  const id = randomUUID()
  await db.insert(userTable).values({
    id,
    name: name.trim(),
    email: normalizedEmail,
    passwordHash: hashPassword(password),
    isAdmin,
    role,
    rank: rank ?? (isAdmin ? (role === 'master_admin' ? 'master' : 'junior') : undefined),
    title: title ?? (role === 'master_admin' ? 'Master Admin' : undefined),
    permissions: serializePermissions(getDefaultPermissions(role)),
    tokenVersion: 0,
    accountStatus: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
  })

  return { id, name: name.trim(), email: normalizedEmail }
}

export async function authenticateUser(email: string, password: string): Promise<AuthUser | null> {
  const db = await getDb()
  if (!db) return null

  const rows = await db.select().from(userTable)
    .where(eq(userTable.email, normalizeEmail(email)))
    .limit(1)
  const user = rows[0]

  if (!user || user.accountStatus !== 'active' || !user.passwordHash) return null
  if (!verifyPassword(password, user.passwordHash)) return null
  return mapDbUser(user)
}

export async function createSession(userId: string): Promise<string> {
  const db = await getDb()
  if (!db) throw new Error('Database not available')

  const rows = await db.select().from(userTable).where(eq(userTable.id, userId)).limit(1)
  const user = rows[0]
  if (!user || user.accountStatus !== 'active') throw new Error('User unavailable')

  return signToken({
    userId: user.id,
    tokenVersion: user.tokenVersion ?? 0,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
  })
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const token = (await cookies()).get('session')?.value
  if (!token) return null

  const payload = verifyToken(token)
  if (!payload || Number(payload.exp) < Date.now()) return null

  const db = await getDb()
  if (!db) return null

  const rows = await db.select().from(userTable)
    .where(eq(userTable.id, String(payload.userId)))
    .limit(1)
  const user = rows[0]

  if (!user || user.accountStatus !== 'active') return null
  if ((user.tokenVersion ?? 0) !== (Number(payload.tokenVersion) || 0)) return null
  return mapDbUser(user)
}

export async function deleteSession(): Promise<void> {
  // Stateless signed sessions are invalidated by cookie deletion/tokenVersion changes.
}

export function generateResetToken(email: string): string {
  return signToken({ type: 'reset', email: normalizeEmail(email), exp: Date.now() + 60 * 60 * 1000 })
}

export function verifyResetToken(token: string): string | null {
  const payload = verifyToken(token)
  if (!payload || payload.type !== 'reset' || Number(payload.exp) < Date.now()) return null
  return String(payload.email)
}

export async function updatePassword(email: string, password: string): Promise<boolean> {
  const db = await getDb()
  if (!db) return false

  await db.update(userTable).set({
    passwordHash: hashPassword(password),
    tokenVersion: sql`${userTable.tokenVersion} + 1`,
    updatedAt: new Date(),
  }).where(eq(userTable.email, normalizeEmail(email)))
  return true
}

export async function updateUser(
  id: string,
  updates: { name?: string; username?: string; phone?: string; showFullName?: boolean },
): Promise<boolean> {
  const db = await getDb()
  if (!db) return false

  const values: Partial<Pick<DbUser, 'name' | 'username' | 'phone' | 'showFullName' | 'updatedAt'>> = {
    updatedAt: new Date(),
  }
  if (updates.name) values.name = updates.name.trim()
  if (updates.username !== undefined) values.username = updates.username || null
  if (updates.phone !== undefined) values.phone = updates.phone || null
  if (updates.showFullName !== undefined) values.showFullName = updates.showFullName

  await db.update(userTable).set(values).where(eq(userTable.id, id))
  return true
}

export function generateEmailVerificationToken(email: string): string {
  return signToken({ type: 'verify', email: normalizeEmail(email), exp: Date.now() + 24 * 60 * 60 * 1000 })
}

export function verifyEmailToken(token: string): string | null {
  const payload = verifyToken(token)
  if (!payload || payload.type !== 'verify' || Number(payload.exp) < Date.now()) return null
  return String(payload.email)
}

export async function markEmailVerified(email: string): Promise<boolean> {
  const db = await getDb()
  if (!db) return false
  await db.update(userTable)
    .set({ emailVerified: true, updatedAt: new Date() })
    .where(eq(userTable.email, normalizeEmail(email)))
  return true
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
  const db = await getDb()
  if (!db) return false
  const rows = await db.select({ value: userTable.emailVerified })
    .from(userTable)
    .where(eq(userTable.email, normalizeEmail(email)))
    .limit(1)
  return rows[0]?.value ?? false
}

export async function getUserNameByEmail(email: string): Promise<string | null> {
  const db = await getDb()
  if (!db) return null
  const rows = await db.select({ name: userTable.name })
    .from(userTable)
    .where(eq(userTable.email, normalizeEmail(email)))
    .limit(1)
  return rows[0]?.name ?? null
}

function getAdminEmail(): string {
  return process.env.ADMIN_EMAIL || MASTER_ADMIN_EMAIL
}

function getAdminPassword(): string {
  const password = process.env.ADMIN_PASSWORD
  if (!password) throw new Error('ADMIN_PASSWORD is required to seed the initial admin account')
  return password
}

let seedingDbAdmin = false

export async function seedDbAdmin(): Promise<void> {
  if (seedingDbAdmin) return
  seedingDbAdmin = true
  try {
    const db = await getDb()
    if (!db) return

    const email = normalizeEmail(getAdminEmail())
    const existing = await db.select({ id: userTable.id })
      .from(userTable)
      .where(eq(userTable.email, email))
      .limit(1)
    if (existing.length > 0) return

    await db.insert(userTable).values({
      id: randomUUID(),
      name: 'Admin',
      email,
      passwordHash: hashPassword(getAdminPassword()),
      isAdmin: true,
      role: 'master_admin',
      rank: 'master',
      title: 'Master Admin',
      permissions: serializePermissions(getDefaultPermissions('master_admin')),
      accountStatus: 'active',
      tokenVersion: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).catch((error) => console.error('[auth] admin seed failed', error))
  } finally {
    seedingDbAdmin = false
  }
}

export async function requireAdmin(): Promise<AuthUser> {
  const user = await getCurrentUser()
  if (!user || !user.isAdmin) throw new Error('Unauthorized: admin access required')
  return user
}

export async function requireMasterAdmin(): Promise<AuthUser> {
  const user = await getCurrentUser()
  if (!user || user.role !== 'master_admin') throw new Error('Unauthorized: master admin access required')
  return user
}

export async function getAdminUser(): Promise<AuthUser | null> {
  const user = await getCurrentUser()
  return user?.isAdmin ? user : null
}

export type AdminUserListItem = AuthUser

export interface AdminUserUpdate {
  role?: UserRole
  rank?: AdminRank
  title?: string
  permissions?: Permission[]
}

export async function listAllUsers(): Promise<AdminUserListItem[]> {
  const db = await getDb()
  if (!db) return []
  const rows = await db.select().from(userTable)
  return rows.map(mapDbUser)
}

export async function getUserById(id: string): Promise<AuthUser | null> {
  const db = await getDb()
  if (!db) return null
  const rows = await db.select().from(userTable).where(eq(userTable.id, id)).limit(1)
  return rows[0] ? mapDbUser(rows[0]) : null
}

export async function setUserAdmin(id: string, updates: AdminUserUpdate): Promise<AuthUser> {
  const db = await getDb()
  if (!db) throw new Error('Database not available')

  const values: {
    updatedAt: Date
    tokenVersion: ReturnType<typeof sql>
    role?: UserRole
    isAdmin?: boolean
    rank?: AdminRank
    title?: string | null
    permissions?: string
  } = {
    updatedAt: new Date(),
    tokenVersion: sql`${userTable.tokenVersion} + 1`,
  }

  if (updates.role !== undefined) {
    values.role = updates.role
    values.isAdmin = updates.role === 'admin' || updates.role === 'master_admin'
  }
  if (updates.rank !== undefined) values.rank = updates.rank
  if (updates.title !== undefined) values.title = updates.title || null
  if (updates.permissions !== undefined) values.permissions = serializePermissions(updates.permissions)

  await db.update(userTable).set(values).where(eq(userTable.id, id))
  const updated = await getUserById(id)
  if (!updated) throw new Error('User not found')
  return updated
}

export async function demoteUserToRegular(id: string): Promise<void> {
  await setUserAdmin(id, { role: 'user', permissions: [] })
}

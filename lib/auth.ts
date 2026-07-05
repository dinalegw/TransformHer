import 'server-only'
import { cookies } from 'next/headers'
import { randomUUID, pbkdf2Sync, randomBytes, createHmac } from 'crypto'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'

export interface AuthUser {
  id: string
  name: string
  email: string
  isAdmin: boolean
}

interface StoredUser {
  id: string
  name: string
  email: string
  passwordHash: string
  isAdmin: boolean
}

interface AuthStore {
  users: Map<string, StoredUser>
  emailIndex: Map<string, string>
  resetTokens: Map<string, { email: string; exp: number }>
}

declare global {
  var __authStore: AuthStore | undefined
}

const SECRET: string = process.env.AUTH_SECRET ?? (() => { throw new Error('AUTH_SECRET environment variable is required') })()

const DATA_DIR = join(process.cwd(), 'data')
const USERS_FILE = join(DATA_DIR, 'users.json')

function loadStore(): AuthStore {
  const store: AuthStore = {
    users: new Map(),
    emailIndex: new Map(),
    resetTokens: new Map(),
  }

  try {
    if (existsSync(USERS_FILE)) {
      const raw = readFileSync(USERS_FILE, 'utf-8')
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
    }
  } catch {
    // corrupt file, start fresh
  }

  return store
}

function saveStore(store: AuthStore): void {
  try {
    if (!existsSync(DATA_DIR)) {
      mkdirSync(DATA_DIR, { recursive: true })
    }
    const data = {
      users: Array.from(store.users.values()),
      resetTokens: Array.from(store.resetTokens.entries()).map(([token, value]) => ({
        token,
        email: value.email,
        exp: value.exp,
      })),
    }
    writeFileSync(USERS_FILE, JSON.stringify(data, null, 2), 'utf-8')
  } catch {
    // silently fail – data is still in memory
  }
}

function getStore(): AuthStore {
  if (!globalThis.__authStore) {
    globalThis.__authStore = loadStore()
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
  const sig = createHmac('sha256', SECRET).update(data).digest('base64url')
  return `${data}.${sig}`
}

function verifyToken(token: string): Record<string, unknown> | null {
  const parts = token.split('.')
  if (parts.length !== 2) return null
  const [data, sig] = parts
  const expectedSig = createHmac('sha256', SECRET).update(data).digest('base64url')
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
): Promise<{ id: string; name: string; email: string }> {
  const store = getStore()
  const normalizedEmail = normalizeEmail(email)

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
    isAdmin: false,
  }

  store.users.set(id, user)
  store.emailIndex.set(normalizedEmail, id)
  persistStore()

  return { id, name: user.name, email: normalizedEmail }
}

export async function authenticateUser(
  email: string,
  password: string,
): Promise<{ id: string; name: string; email: string; isAdmin: boolean } | null> {
  const store = getStore()
  const normalizedEmail = normalizeEmail(email)
  const userId = store.emailIndex.get(normalizedEmail)
  if (!userId) return null

  const user = store.users.get(userId)
  if (!user) return null

  const valid = verifyPassword(password, user.passwordHash)
  if (!valid) return null

  return { id: user.id, name: user.name, email: user.email, isAdmin: user.isAdmin }
}

export async function createSession(userId: string): Promise<string> {
  const store = getStore()
  const user = store.users.get(userId)
  if (!user) throw new Error('User not found')

  const token = signToken({
    userId: user.id,
    name: user.name,
    email: user.email,
    isAdmin: user.isAdmin,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
  })
  return token
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) return null

  const payload = verifyToken(token)
  if (!payload) return null

  const exp = payload.exp as number
  if (exp < Date.now()) return null

  const store = getStore()
  const userId = payload.userId as string
  const user = store.users.get(userId)
  if (!user) return null

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    isAdmin: user.isAdmin,
  }
}

export async function deleteSession(): Promise<void> {
  // cookie-based, nothing to clear server-side
}

export function generateResetToken(email: string): string {
  const store = getStore()
  const token = randomBytes(32).toString('hex')
  store.resetTokens.set(token, {
    email: normalizeEmail(email),
    exp: Date.now() + 60 * 60 * 1000,
  })
  persistStore()
  return token
}

export function verifyResetToken(token: string): string | null {
  const store = getStore()
  const data = store.resetTokens.get(token)
  if (!data) return null
  if (data.exp < Date.now()) {
    store.resetTokens.delete(token)
    persistStore()
    return null
  }
  store.resetTokens.delete(token)
  persistStore()
  return data.email
}

export function updatePassword(email: string, newPassword: string): boolean {
  const store = getStore()
  const userId = store.emailIndex.get(normalizeEmail(email))
  if (!userId) return false

  const user = store.users.get(userId)
  if (!user) return false

  user.passwordHash = hashPassword(newPassword)
  persistStore()
  return true
}

const ADMIN_HASH = '219539f6cbd1d1a25a03a1cfe5c30973:6b4e02810303fcbe9714d15e3470bc63751109cb4cc148999e3e97d1a4267182'

function seedAdminUser(): void {
  const store = getStore()
  if (store.emailIndex.has('admin@transformher.com')) return

  const id = randomUUID()
  const user: StoredUser = {
    id,
    name: 'Admin',
    email: 'admin@transformher.com',
    passwordHash: ADMIN_HASH,
    isAdmin: true,
  }
  store.users.set(id, user)
  store.emailIndex.set('admin@transformher.com', id)
  persistStore()
}

// Seed admin on first load
seedAdminUser()

import 'server-only'
import { cookies } from 'next/headers'
import { randomUUID, pbkdf2Sync, randomBytes, createHmac } from 'crypto'

export interface AuthUser {
  id: string
  name: string
  email: string
  isAdmin: boolean
}

const SECRET = process.env.AUTH_SECRET ?? 'transformher-dev-secret-key-2024'

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

interface StoredUser {
  id: string
  name: string
  email: string
  passwordHash: string
  isAdmin: boolean
}

const users = new Map<string, StoredUser>()
const emailIndex = new Map<string, string>()

export async function createUser(name: string, email: string, password: string): Promise<{ id: string; name: string; email: string }> {
  if (emailIndex.has(email.toLowerCase())) throw new Error('Email already in use')
  const id = randomUUID()
  const passwordHash = hashPassword(password)
  const user: StoredUser = { id, name, email: email.toLowerCase(), passwordHash, isAdmin: false }
  users.set(id, user)
  emailIndex.set(email.toLowerCase(), id)
  return { id, name, email: user.email }
}

export async function authenticateUser(email: string, password: string): Promise<{ id: string; name: string; email: string; isAdmin: boolean } | null> {
  const userId = emailIndex.get(email.toLowerCase())
  if (!userId) return null
  const user = users.get(userId)!
  const valid = verifyPassword(password, user.passwordHash)
  if (!valid) return null
  return { id: user.id, name: user.name, email: user.email, isAdmin: user.isAdmin }
}

export async function createSession(userId: string): Promise<string> {
  const user = users.get(userId)
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
  return {
    id: payload.userId as string,
    name: payload.name as string,
    email: payload.email as string,
    isAdmin: payload.isAdmin as boolean,
  }
}

export async function deleteSession(): Promise<void> {
  // cookie-based, nothing to clear server-side
}

const resetTokens = new Map<string, { email: string; exp: number }>()

export function generateResetToken(email: string): string {
  const token = randomBytes(32).toString('hex')
  resetTokens.set(token, {
    email: email.toLowerCase(),
    exp: Date.now() + 60 * 60 * 1000,
  })
  return token
}

export function verifyResetToken(token: string): string | null {
  const data = resetTokens.get(token)
  if (!data) return null
  if (data.exp < Date.now()) {
    resetTokens.delete(token)
    return null
  }
  return data.email
}

export function updatePassword(email: string, newPassword: string): boolean {
  const userId = emailIndex.get(email.toLowerCase())
  if (!userId) return false
  const user = users.get(userId)
  if (!user) return false
  user.passwordHash = hashPassword(newPassword)
  return true
}

const ADMIN_HASH = '219539f6cbd1d1a25a03a1cfe5c30973:6b4e02810303fcbe9714d15e3470bc63751109cb4cc148999e3e97d1a4267182'

function seedAdminUser() {
  if (emailIndex.has('admin@transformher.com')) return
  const id = randomUUID()
  const user: StoredUser = {
    id,
    name: 'Admin',
    email: 'admin@transformher.com',
    passwordHash: ADMIN_HASH,
    isAdmin: true,
  }
  users.set(id, user)
  emailIndex.set('admin@transformher.com', id)
}

seedAdminUser()

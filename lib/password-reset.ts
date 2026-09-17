import 'server-only'

import { createHmac, randomUUID, timingSafeEqual } from 'crypto'
import { eq } from 'drizzle-orm'
import { getDb } from '@/lib/db/connection'
import { user as userTable } from '@/lib/db/schema'

interface ResetPayload {
  type: 'password_reset'
  email: string
  tokenVersion: number
  nonce: string
  exp: number
}

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

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function signPayload(payload: ResetPayload): string {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signature = createHmac('sha256', getSecret()).update(data).digest('base64url')
  return `${data}.${signature}`
}

function verifySignature(token: string): ResetPayload | null {
  const [data, signature, extra] = token.split('.')
  if (!data || !signature || extra) return null

  const expected = createHmac('sha256', getSecret()).update(data).digest('base64url')
  const actualBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expected)
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) {
    return null
  }

  try {
    const parsed = JSON.parse(Buffer.from(data, 'base64url').toString()) as Partial<ResetPayload>
    if (
      parsed.type !== 'password_reset'
      || typeof parsed.email !== 'string'
      || typeof parsed.tokenVersion !== 'number'
      || typeof parsed.nonce !== 'string'
      || typeof parsed.exp !== 'number'
    ) {
      return null
    }
    return parsed as ResetPayload
  } catch {
    return null
  }
}

/**
 * Generate a reset link bound to the account's current tokenVersion.
 * A successful password change increments tokenVersion, making every previously
 * issued reset link invalid immediately.
 */
export async function generatePasswordResetToken(email: string): Promise<string | null> {
  const db = await getDb()
  if (!db) throw new Error('Database not available')

  const normalizedEmail = normalizeEmail(email)
  const rows = await db.select({
    email: userTable.email,
    tokenVersion: userTable.tokenVersion,
    accountStatus: userTable.accountStatus,
  }).from(userTable)
    .where(eq(userTable.email, normalizedEmail))
    .limit(1)

  const user = rows[0]
  if (!user || user.accountStatus !== 'active') return null

  return signPayload({
    type: 'password_reset',
    email: user.email,
    tokenVersion: user.tokenVersion ?? 0,
    nonce: randomUUID(),
    exp: Date.now() + 60 * 60 * 1000,
  })
}

/**
 * Verify signature, expiry, active account state and tokenVersion. This prevents
 * a password-reset URL from being replayed after it has already been used.
 */
export async function verifyPasswordResetToken(token: string): Promise<string | null> {
  const payload = verifySignature(token)
  if (!payload || payload.exp < Date.now()) return null

  const db = await getDb()
  if (!db) throw new Error('Database not available')

  const rows = await db.select({
    email: userTable.email,
    tokenVersion: userTable.tokenVersion,
    accountStatus: userTable.accountStatus,
  }).from(userTable)
    .where(eq(userTable.email, normalizeEmail(payload.email)))
    .limit(1)

  const user = rows[0]
  if (!user || user.accountStatus !== 'active') return null
  if ((user.tokenVersion ?? 0) !== payload.tokenVersion) return null

  return user.email
}

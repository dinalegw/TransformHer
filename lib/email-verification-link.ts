import 'server-only'

import { createHmac, randomUUID, timingSafeEqual } from 'crypto'
import { eq } from 'drizzle-orm'
import { getDb } from '@/lib/db/connection'
import { user as userTable } from '@/lib/db/schema'

interface EmailVerificationPayload {
  type: 'email_verification'
  userId: string
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

function signPayload(payload: EmailVerificationPayload): string {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signature = createHmac('sha256', getSecret()).update(data).digest('base64url')
  return `${data}.${signature}`
}

function verifySignature(token: string): EmailVerificationPayload | null {
  const [data, signature, extra] = token.split('.')
  if (!data || !signature || extra) return null

  const expected = createHmac('sha256', getSecret()).update(data).digest('base64url')
  const actualBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expected)
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) {
    return null
  }

  try {
    const parsed = JSON.parse(Buffer.from(data, 'base64url').toString()) as Partial<EmailVerificationPayload>
    if (
      parsed.type !== 'email_verification'
      || typeof parsed.userId !== 'string'
      || typeof parsed.email !== 'string'
      || typeof parsed.tokenVersion !== 'number'
      || typeof parsed.nonce !== 'string'
      || typeof parsed.exp !== 'number'
    ) {
      return null
    }
    return parsed as EmailVerificationPayload
  } catch {
    return null
  }
}

/**
 * Registration verification links are bound to the exact account row and its
 * current tokenVersion. Deleting and recreating an account with the same email
 * therefore cannot make an old verification link valid for the new account.
 */
export async function generateEmailVerificationLinkToken(
  userId: string,
  email: string,
): Promise<string | null> {
  const db = await getDb()
  if (!db) throw new Error('Database not available')

  const rows = await db.select({
    id: userTable.id,
    email: userTable.email,
    emailVerified: userTable.emailVerified,
    tokenVersion: userTable.tokenVersion,
    accountStatus: userTable.accountStatus,
  }).from(userTable).where(eq(userTable.id, userId)).limit(1)

  const user = rows[0]
  const normalizedEmail = normalizeEmail(email)
  if (
    !user
    || user.accountStatus !== 'active'
    || normalizeEmail(user.email) !== normalizedEmail
    || user.emailVerified
  ) {
    return null
  }

  return signPayload({
    type: 'email_verification',
    userId: user.id,
    email: normalizedEmail,
    tokenVersion: user.tokenVersion ?? 0,
    nonce: randomUUID(),
    exp: Date.now() + 24 * 60 * 60 * 1000,
  })
}

/**
 * Verify the signed capability against the live account before marking email
 * verification complete. The operation is idempotent for the same account.
 */
export async function verifyAndMarkEmailVerificationToken(token: string): Promise<{
  email: string
  name: string
  alreadyVerified: boolean
} | null> {
  const payload = verifySignature(token)
  if (!payload || payload.exp < Date.now()) return null

  const db = await getDb()
  if (!db) throw new Error('Database not available')

  const rows = await db.select({
    id: userTable.id,
    name: userTable.name,
    email: userTable.email,
    emailVerified: userTable.emailVerified,
    tokenVersion: userTable.tokenVersion,
    accountStatus: userTable.accountStatus,
  }).from(userTable).where(eq(userTable.id, payload.userId)).limit(1)

  const user = rows[0]
  if (
    !user
    || user.accountStatus !== 'active'
    || normalizeEmail(user.email) !== normalizeEmail(payload.email)
    || (user.tokenVersion ?? 0) !== payload.tokenVersion
  ) {
    return null
  }

  const alreadyVerified = user.emailVerified ?? false
  if (!alreadyVerified) {
    await db.update(userTable).set({
      emailVerified: true,
      updatedAt: new Date(),
    }).where(eq(userTable.id, user.id))
  }

  return {
    email: user.email,
    name: user.name,
    alreadyVerified,
  }
}

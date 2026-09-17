import 'server-only'

import { createHmac, randomInt, timingSafeEqual } from 'crypto'
import { eq, sql } from 'drizzle-orm'
import { integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { getDb } from '@/lib/db/connection'
import { user as userTable } from '@/lib/db/schema'

const CODE_EXPIRY_MS = 10 * 60 * 1000
const RESEND_COOLDOWN_MS = 60 * 1000
const MAX_ATTEMPTS = 5

const emailVerificationCodes = pgTable('email_verification_codes', {
  userId: text('user_id').primaryKey(),
  codeHash: text('code_hash').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  attempts: integer('attempts').notNull().default(0),
  requestedAt: timestamp('requested_at').notNull().$default(() => new Date()),
})

export class EmailVerificationCodeError extends Error {
  readonly code: 'already_verified' | 'cooldown' | 'account_unavailable' | 'invalid_code' | 'expired_code' | 'too_many_attempts'
  readonly retryAfter?: number

  constructor(
    message: string,
    code: EmailVerificationCodeError['code'],
    retryAfter?: number,
  ) {
    super(message)
    this.name = 'EmailVerificationCodeError'
    this.code = code
    this.retryAfter = retryAfter
  }
}

let schemaReady = false
let schemaPromise: Promise<void> | null = null

function getVerificationSecret(): string {
  const secret = process.env.EMAIL_VERIFICATION_SECRET || process.env.AUTH_SECRET
  if (secret) return secret
  if (process.env.NODE_ENV !== 'production') return 'transformher-dev-email-verification-secret'
  throw new Error('AUTH_SECRET is not configured')
}

function hashCode(userId: string, code: string): string {
  return createHmac('sha256', getVerificationSecret())
    .update(`${userId}:${code}`)
    .digest('hex')
}

function hashesMatch(expected: string, actual: string): boolean {
  const a = Buffer.from(expected, 'hex')
  const b = Buffer.from(actual, 'hex')
  return a.length === b.length && timingSafeEqual(a, b)
}

async function ensureSchema() {
  if (schemaReady) return
  if (schemaPromise) return schemaPromise

  schemaPromise = (async () => {
    const db = await getDb()
    if (!db) throw new Error('Database not available')

    await db.execute(sql.raw(`CREATE TABLE IF NOT EXISTS "email_verification_codes" (
      "user_id" text PRIMARY KEY REFERENCES "user"("id") ON DELETE cascade,
      "code_hash" text NOT NULL,
      "expires_at" timestamp NOT NULL,
      "attempts" integer NOT NULL DEFAULT 0,
      "requested_at" timestamp NOT NULL DEFAULT now()
    );`))
    await db.execute(sql.raw(`CREATE INDEX IF NOT EXISTS "email_verification_codes_expiry_idx" ON "email_verification_codes"("expires_at");`))
    schemaReady = true
  })()

  try {
    await schemaPromise
  } finally {
    schemaPromise = null
  }
}

export async function issueEmailVerificationCode(userId: string) {
  await ensureSchema()
  const db = await getDb()
  if (!db) throw new Error('Database not available')

  const users = await db.select({
    emailVerified: userTable.emailVerified,
    accountStatus: userTable.accountStatus,
  }).from(userTable).where(eq(userTable.id, userId)).limit(1)
  const user = users[0]
  if (!user || user.accountStatus !== 'active') {
    throw new EmailVerificationCodeError('Account is unavailable.', 'account_unavailable')
  }
  if (user.emailVerified) {
    throw new EmailVerificationCodeError('Your email is already verified.', 'already_verified')
  }

  const existing = await db.select({ requestedAt: emailVerificationCodes.requestedAt })
    .from(emailVerificationCodes)
    .where(eq(emailVerificationCodes.userId, userId))
    .limit(1)

  if (existing[0]?.requestedAt) {
    const remainingMs = RESEND_COOLDOWN_MS - (Date.now() - existing[0].requestedAt.getTime())
    if (remainingMs > 0) {
      const retryAfter = Math.max(1, Math.ceil(remainingMs / 1000))
      throw new EmailVerificationCodeError(
        `Please wait ${retryAfter} seconds before requesting another verification code.`,
        'cooldown',
        retryAfter,
      )
    }
  }

  const code = randomInt(0, 1_000_000).toString().padStart(6, '0')
  const now = new Date()
  const expiresAt = new Date(now.getTime() + CODE_EXPIRY_MS)

  await db.insert(emailVerificationCodes).values({
    userId,
    codeHash: hashCode(userId, code),
    expiresAt,
    attempts: 0,
    requestedAt: now,
  }).onConflictDoUpdate({
    target: emailVerificationCodes.userId,
    set: {
      codeHash: hashCode(userId, code),
      expiresAt,
      attempts: 0,
      requestedAt: now,
    },
  })

  return { code, expiresInMinutes: CODE_EXPIRY_MS / 60_000 }
}

export async function invalidateEmailVerificationCode(userId: string): Promise<void> {
  await ensureSchema()
  const db = await getDb()
  if (!db) return
  await db.delete(emailVerificationCodes).where(eq(emailVerificationCodes.userId, userId))
}

export async function confirmEmailVerificationCode(userId: string, code: string): Promise<void> {
  await ensureSchema()
  const db = await getDb()
  if (!db) throw new Error('Database not available')

  const normalizedCode = code.trim()
  if (!/^\d{6}$/.test(normalizedCode)) {
    throw new EmailVerificationCodeError('Enter the 6-digit verification code.', 'invalid_code')
  }

  const users = await db.select({
    emailVerified: userTable.emailVerified,
    accountStatus: userTable.accountStatus,
  }).from(userTable).where(eq(userTable.id, userId)).limit(1)
  const user = users[0]
  if (!user || user.accountStatus !== 'active') {
    throw new EmailVerificationCodeError('Account is unavailable.', 'account_unavailable')
  }
  if (user.emailVerified) {
    await invalidateEmailVerificationCode(userId)
    return
  }

  const rows = await db.select().from(emailVerificationCodes)
    .where(eq(emailVerificationCodes.userId, userId))
    .limit(1)
  const record = rows[0]

  if (!record) {
    throw new EmailVerificationCodeError('Request a new verification code first.', 'invalid_code')
  }
  if (record.expiresAt.getTime() < Date.now()) {
    await db.delete(emailVerificationCodes).where(eq(emailVerificationCodes.userId, userId))
    throw new EmailVerificationCodeError('That verification code has expired. Request a new code.', 'expired_code')
  }
  if ((record.attempts ?? 0) >= MAX_ATTEMPTS) {
    await db.delete(emailVerificationCodes).where(eq(emailVerificationCodes.userId, userId))
    throw new EmailVerificationCodeError('Too many incorrect attempts. Request a new verification code.', 'too_many_attempts')
  }

  const suppliedHash = hashCode(userId, normalizedCode)
  if (!hashesMatch(record.codeHash, suppliedHash)) {
    const nextAttempts = (record.attempts ?? 0) + 1
    if (nextAttempts >= MAX_ATTEMPTS) {
      await db.delete(emailVerificationCodes).where(eq(emailVerificationCodes.userId, userId))
      throw new EmailVerificationCodeError('Too many incorrect attempts. Request a new verification code.', 'too_many_attempts')
    }

    await db.update(emailVerificationCodes)
      .set({ attempts: nextAttempts })
      .where(eq(emailVerificationCodes.userId, userId))
    throw new EmailVerificationCodeError(
      `Incorrect verification code. ${MAX_ATTEMPTS - nextAttempts} attempt${MAX_ATTEMPTS - nextAttempts === 1 ? '' : 's'} remaining.`,
      'invalid_code',
    )
  }

  await db.transaction(async (tx) => {
    await tx.update(userTable).set({
      emailVerified: true,
      updatedAt: new Date(),
    }).where(eq(userTable.id, userId))
    await tx.delete(emailVerificationCodes).where(eq(emailVerificationCodes.userId, userId))
  })
}

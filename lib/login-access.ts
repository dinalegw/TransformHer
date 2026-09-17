import 'server-only'

import { pbkdf2Sync, timingSafeEqual } from 'crypto'
import { eq } from 'drizzle-orm'
import { getDb } from '@/lib/db/connection'
import { user as userTable } from '@/lib/db/schema'

export type BlockedAccountState = 'frozen' | 'archived' | 'deletion_pending'

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
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

/**
 * Returns a blocked lifecycle state only after the supplied password is valid.
 * This lets the UI explain a frozen/archived account without leaking account
 * status to someone who merely knows the email address.
 */
export async function getBlockedLoginState(
  email: string,
  password: string,
): Promise<BlockedAccountState | null> {
  const db = await getDb()
  if (!db) throw new Error('Database not available')

  const rows = await db.select({
    passwordHash: userTable.passwordHash,
    accountStatus: userTable.accountStatus,
  }).from(userTable)
    .where(eq(userTable.email, normalizeEmail(email)))
    .limit(1)

  const user = rows[0]
  if (!user?.passwordHash || !verifyPassword(password, user.passwordHash)) return null

  if (user.accountStatus === 'frozen') return 'frozen'
  if (user.accountStatus === 'archived') return 'archived'
  if (user.accountStatus === 'deletion_pending') return 'deletion_pending'
  return null
}

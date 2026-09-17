import 'server-only'

import { and, eq, lte, sql } from 'drizzle-orm'
import { pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { getDb } from '@/lib/db/connection'

const notificationClaims = pgTable('notification_claims', {
  key: text('key').primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull(),
})

let schemaReady = false
let schemaPromise: Promise<void> | null = null

async function ensureSchema() {
  if (schemaReady) return
  if (schemaPromise) return schemaPromise

  schemaPromise = (async () => {
    const db = await getDb()
    if (!db) throw new Error('Database not available')

    await db.execute(sql.raw(`CREATE TABLE IF NOT EXISTS "notification_claims" (
      "key" text PRIMARY KEY,
      "expires_at" timestamp NOT NULL,
      "created_at" timestamp NOT NULL DEFAULT now()
    );`))
    await db.execute(sql.raw(
      'CREATE INDEX IF NOT EXISTS "notification_claims_expiry_idx" ON "notification_claims"("expires_at");',
    ))
    schemaReady = true
  })()

  try {
    await schemaPromise
  } finally {
    schemaPromise = null
  }
}

/**
 * Atomically claims a notification key for a short TTL. Useful when browsers,
 * retries, or horizontally-scaled functions can submit the same successful
 * action more than once. Only the first claimant sends the email.
 */
export async function claimNotification(key: string, ttlMs: number): Promise<boolean> {
  await ensureSchema()
  const db = await getDb()
  if (!db) return true

  const now = new Date()
  await db.delete(notificationClaims)
    .where(and(eq(notificationClaims.key, key), lte(notificationClaims.expiresAt, now)))

  const inserted = await db.insert(notificationClaims)
    .values({
      key,
      expiresAt: new Date(now.getTime() + ttlMs),
      createdAt: now,
    })
    .onConflictDoNothing()
    .returning({ key: notificationClaims.key })

  return inserted.length === 1
}

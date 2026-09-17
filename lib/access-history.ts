import 'server-only'
import { randomUUID } from 'crypto'
import { desc, eq, sql } from 'drizzle-orm'
import { index, pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { getDb } from '@/lib/db/connection'

const MAX_IP_LENGTH = 64
const MAX_USER_AGENT_LENGTH = 600
const MAX_DEVICE_LENGTH = 180
const MAX_LOCATION_LENGTH = 120

export const userAccessEvents = pgTable('user_access_events', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  eventType: text('event_type').notNull().default('login'),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  deviceSummary: text('device_summary'),
  city: text('city'),
  country: text('country'),
  accessedAt: timestamp('accessed_at').notNull().$default(() => new Date()),
}, (table) => ({
  userIdx: index('user_access_events_user_idx').on(table.userId),
  accessedAtIdx: index('user_access_events_accessed_at_idx').on(table.accessedAt),
}))

export const deletedUserAccessEvents = pgTable('deleted_user_access_events', {
  id: text('id').primaryKey(),
  archiveId: text('archive_id').notNull(),
  originalUserId: text('original_user_id').notNull(),
  eventType: text('event_type').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  deviceSummary: text('device_summary'),
  city: text('city'),
  country: text('country'),
  accessedAt: timestamp('accessed_at').notNull(),
  retainedAt: timestamp('retained_at').notNull().$default(() => new Date()),
}, (table) => ({
  archiveIdx: index('deleted_user_access_events_archive_idx').on(table.archiveId),
  originalUserIdx: index('deleted_user_access_events_original_user_idx').on(table.originalUserId),
  accessedAtIdx: index('deleted_user_access_events_accessed_at_idx').on(table.accessedAt),
}))

let schemaPromise: Promise<void> | null = null
let schemaReady = false

function limit(value: string | null | undefined, max: number): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed.slice(0, max) : null
}

function decodeHeader(value: string | null): string | null {
  if (!value) return null
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function requestIp(req: Request): string | null {
  const forwarded = req.headers.get('x-forwarded-for')
  const firstForwarded = forwarded?.split(',')[0]?.trim()
  return limit(
    firstForwarded
      || req.headers.get('x-real-ip')
      || req.headers.get('cf-connecting-ip'),
    MAX_IP_LENGTH,
  )
}

function deviceSummary(userAgent: string | null): string | null {
  if (!userAgent) return null

  const ua = userAgent
  let browser = 'Browser'
  let os = 'Unknown OS'

  if (/Edg\//i.test(ua)) browser = 'Microsoft Edge'
  else if (/OPR\//i.test(ua)) browser = 'Opera'
  else if (/Firefox\//i.test(ua)) browser = 'Firefox'
  else if (/Chrome\//i.test(ua)) browser = 'Chrome'
  else if (/Safari\//i.test(ua)) browser = 'Safari'

  if (/Windows NT 10\.0/i.test(ua)) os = 'Windows'
  else if (/Android/i.test(ua)) os = 'Android'
  else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS/iPadOS'
  else if (/Mac OS X/i.test(ua)) os = 'macOS'
  else if (/Linux/i.test(ua)) os = 'Linux'

  return limit(`${browser} on ${os}`, MAX_DEVICE_LENGTH)
}

export async function ensureAccessHistorySchema(): Promise<void> {
  if (schemaReady) return
  if (schemaPromise) return schemaPromise

  schemaPromise = (async () => {
    const db = await getDb()
    if (!db) throw new Error('Database not available')

    await db.execute(sql.raw(`CREATE TABLE IF NOT EXISTS "user_access_events" (
      "id" text PRIMARY KEY,
      "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE cascade,
      "event_type" text NOT NULL DEFAULT 'login',
      "ip_address" text,
      "user_agent" text,
      "device_summary" text,
      "city" text,
      "country" text,
      "accessed_at" timestamp NOT NULL DEFAULT now()
    );`))

    await db.execute(sql.raw(`CREATE TABLE IF NOT EXISTS "deleted_user_access_events" (
      "id" text PRIMARY KEY,
      "archive_id" text NOT NULL,
      "original_user_id" text NOT NULL,
      "event_type" text NOT NULL,
      "ip_address" text,
      "user_agent" text,
      "device_summary" text,
      "city" text,
      "country" text,
      "accessed_at" timestamp NOT NULL,
      "retained_at" timestamp NOT NULL DEFAULT now()
    );`))

    for (const statement of [
      `CREATE INDEX IF NOT EXISTS "user_access_events_user_idx" ON "user_access_events"("user_id");`,
      `CREATE INDEX IF NOT EXISTS "user_access_events_accessed_at_idx" ON "user_access_events"("accessed_at");`,
      `CREATE INDEX IF NOT EXISTS "deleted_user_access_events_archive_idx" ON "deleted_user_access_events"("archive_id");`,
      `CREATE INDEX IF NOT EXISTS "deleted_user_access_events_original_user_idx" ON "deleted_user_access_events"("original_user_id");`,
      `CREATE INDEX IF NOT EXISTS "deleted_user_access_events_accessed_at_idx" ON "deleted_user_access_events"("accessed_at");`,
    ]) {
      await db.execute(sql.raw(statement))
    }

    schemaReady = true
  })()

  try {
    await schemaPromise
  } finally {
    schemaPromise = null
  }
}

/**
 * Records successful authenticated access only. It intentionally does not log
 * passwords, auth tokens, cookie values, or arbitrary page-by-page browsing.
 * IP addresses are network observations and are not proof of a person's identity.
 */
export async function recordSuccessfulLoginAccess(userId: string, req: Request): Promise<void> {
  await ensureAccessHistorySchema()
  const db = await getDb()
  if (!db) throw new Error('Database not available')

  const rawUserAgent = limit(req.headers.get('user-agent'), MAX_USER_AGENT_LENGTH)
  const city = limit(decodeHeader(req.headers.get('x-vercel-ip-city')), MAX_LOCATION_LENGTH)
  const country = limit(req.headers.get('x-vercel-ip-country'), MAX_LOCATION_LENGTH)

  await db.insert(userAccessEvents).values({
    id: randomUUID(),
    userId,
    eventType: 'login',
    ipAddress: requestIp(req),
    userAgent: rawUserAgent,
    deviceSummary: deviceSummary(rawUserAgent),
    city,
    country,
    accessedAt: new Date(),
  })
}

export interface RetainedAccessEvent {
  id: string
  eventType: string
  ipAddress: string | null
  userAgent: string | null
  deviceSummary: string | null
  city: string | null
  country: string | null
  accessedAt: Date
  retainedAt: Date
}

export async function getDeletedUserAccessHistory(archiveId: string): Promise<RetainedAccessEvent[]> {
  await ensureAccessHistorySchema()
  const db = await getDb()
  if (!db) throw new Error('Database not available')

  return db.select({
    id: deletedUserAccessEvents.id,
    eventType: deletedUserAccessEvents.eventType,
    ipAddress: deletedUserAccessEvents.ipAddress,
    userAgent: deletedUserAccessEvents.userAgent,
    deviceSummary: deletedUserAccessEvents.deviceSummary,
    city: deletedUserAccessEvents.city,
    country: deletedUserAccessEvents.country,
    accessedAt: deletedUserAccessEvents.accessedAt,
    retainedAt: deletedUserAccessEvents.retainedAt,
  })
    .from(deletedUserAccessEvents)
    .where(eq(deletedUserAccessEvents.archiveId, archiveId))
    .orderBy(desc(deletedUserAccessEvents.accessedAt))
}

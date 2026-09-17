import { createHmac } from 'crypto'
import { NextResponse } from 'next/server'
import { integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { getDb } from '@/lib/db/connection'

const RATE_LIMITS: Record<string, { limit: number; windowMs: number }> = {
  '/api/auth/login': { limit: 5, windowMs: 60_000 },
  '/api/auth/register': { limit: 3, windowMs: 60_000 },
  '/api/auth/forgot-password': { limit: 3, windowMs: 60_000 },
  '/api/auth/reset-password': { limit: 5, windowMs: 60_000 },
  '/api/account/delete': { limit: 3, windowMs: 5 * 60_000 },
  '/api/paystack/initialize': { limit: 10, windowMs: 60_000 },
  '/api/cart/checkout': { limit: 5, windowMs: 60_000 },
}

const rateLimitBuckets = pgTable('rate_limit_buckets', {
  key: text('key').primaryKey(),
  count: integer('count').notNull(),
  resetAt: timestamp('reset_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
})

interface RateLimitEntry {
  count: number
  resetAt: number
}

// Development/emergency fallback only. Production requests normally use Neon so
// limits are shared across all Vercel function instances instead of per-process.
const localBuckets = new Map<string, RateLimitEntry>()
let schemaReady = false
let schemaPromise: Promise<void> | null = null

function getClientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown'
  )
}

function getBucketKey(request: Request, route: string): string {
  const secret = process.env.AUTH_SECRET || 'transformher-rate-limit-development'
  return createHmac('sha256', secret)
    .update(`${route}|${getClientIp(request)}`)
    .digest('hex')
}

async function ensureRateLimitSchema(): Promise<void> {
  if (schemaReady) return
  if (schemaPromise) return schemaPromise

  schemaPromise = (async () => {
    const db = await getDb()
    if (!db) return

    await db.execute(sql.raw(`CREATE TABLE IF NOT EXISTS "rate_limit_buckets" (
      "key" text PRIMARY KEY,
      "count" integer NOT NULL,
      "reset_at" timestamp NOT NULL,
      "updated_at" timestamp NOT NULL DEFAULT now()
    );`))
    await db.execute(sql.raw(
      'CREATE INDEX IF NOT EXISTS "rate_limit_reset_idx" ON "rate_limit_buckets"("reset_at");',
    ))
    schemaReady = true
  })()

  try {
    await schemaPromise
  } finally {
    schemaPromise = null
  }
}

function checkLocalRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now()
  const entry = localBuckets.get(key)

  if (!entry || now >= entry.resetAt) {
    localBuckets.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true }
  }

  entry.count += 1
  if (entry.count > limit) {
    return {
      allowed: false,
      retryAfter: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
    }
  }

  return { allowed: true }
}

export async function checkRateLimit(
  request: Request,
  route: string,
): Promise<{ allowed: boolean; retryAfter?: number }> {
  const config = RATE_LIMITS[route]
  if (!config) return { allowed: true }

  const key = getBucketKey(request, route)
  const now = new Date()
  const nextReset = new Date(now.getTime() + config.windowMs)

  try {
    await ensureRateLimitSchema()
    const db = await getDb()
    if (!db) return checkLocalRateLimit(key, config.limit, config.windowMs)

    const [bucket] = await db.insert(rateLimitBuckets)
      .values({ key, count: 1, resetAt: nextReset, updatedAt: now })
      .onConflictDoUpdate({
        target: rateLimitBuckets.key,
        set: {
          count: sql<number>`CASE WHEN ${rateLimitBuckets.resetAt} <= now() THEN 1 ELSE ${rateLimitBuckets.count} + 1 END`,
          resetAt: sql<Date>`CASE WHEN ${rateLimitBuckets.resetAt} <= now() THEN ${nextReset} ELSE ${rateLimitBuckets.resetAt} END`,
          updatedAt: now,
        },
      })
      .returning({ count: rateLimitBuckets.count, resetAt: rateLimitBuckets.resetAt })

    if (!bucket) return checkLocalRateLimit(key, config.limit, config.windowMs)
    if (bucket.count > config.limit) {
      return {
        allowed: false,
        retryAfter: Math.max(1, Math.ceil((bucket.resetAt.getTime() - Date.now()) / 1000)),
      }
    }

    return { allowed: true }
  } catch (error) {
    console.error('[rate-limit] shared limiter unavailable; using process fallback', error)
    return checkLocalRateLimit(key, config.limit, config.windowMs)
  }
}

export function applyRateLimitHeaders(response: NextResponse, route: string): void {
  const config = RATE_LIMITS[route]
  if (!config) return

  response.headers.set('X-RateLimit-Limit', String(config.limit))
  response.headers.set('X-RateLimit-Window', `${config.windowMs / 1000}s`)
}

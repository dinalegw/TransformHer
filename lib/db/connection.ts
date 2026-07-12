import { drizzle } from 'drizzle-orm/neon-serverless'
import { Pool, type PoolConfig } from '@neondatabase/serverless'
import * as schema from './schema'
import { getLocalDb, closeLocalDb } from './local-connection'

const MAX_RETRIES = 2
const RETRY_DELAY_MS = 500

let _pg: ReturnType<typeof drizzle<typeof schema>> | null = null
let _pgPool: Pool | null = null
let _pgSeeded = false
let _fallbackAttempted = false
let _usingFallback = false

function getConnectionUrl(): string | null {
  return process.env.POSTGRES_URL_NON_POOLING
    ?? process.env.POSTGRES_URL
    ?? process.env.DATABASE_URL_UNPOOLED
    ?? process.env.DATABASE_URL
    ?? null
}

function getPoolConfig(): PoolConfig {
  const url = getConnectionUrl()
  if (!url) return { connectionString: '', max: 0 }

  const isServerless = !!(
    process.env.VERCEL
    || process.env.POSTGRES_URL?.includes('pooler')
  )

  return {
    connectionString: url,
    max: isServerless ? 5 : 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  }
}

async function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function isPoolReady(pool: Pool): Promise<boolean> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(false), 5000)
    pool.connect((err, _client, release) => {
      clearTimeout(timeout)
      if (err) {
        resolve(false)
        return
      }
      if (release) release()
      resolve(true)
    })
  })
}

export async function getDb(): Promise<ReturnType<typeof drizzle<typeof schema>> | null> {
  // If we already have a working connection, return it
  if (_pg) return _pg
  if (_usingFallback) return getLocalDb() as any

  // Try PostgreSQL first
  const url = getConnectionUrl()
  if (url) {
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const config = getPoolConfig()
        _pgPool = new Pool(config)

        const ready = await isPoolReady(_pgPool)
        if (!ready) {
          await _pgPool.end().catch(() => {})
          _pgPool = null
          throw new Error('Database connection timeout')
        }

        _pg = drizzle(_pgPool, { schema })

        if (!_pgSeeded) {
          _pgSeeded = true
          const { seedDbAdmin } = await import('@/lib/auth')
          seedDbAdmin().catch(() => {})
          const { seedInitialBooks } = await import('@/lib/db/seed')
          seedInitialBooks().catch(() => {})
        }

        return _pg
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err))
        console.error(`[db] PostgreSQL attempt ${attempt}/${MAX_RETRIES} failed:`, lastError.message)

        if (_pgPool) {
          await _pgPool.end().catch(() => {})
          _pgPool = null
        }

        if (attempt < MAX_RETRIES) {
          await wait(RETRY_DELAY_MS * attempt)
        }
      }
    }
    console.error('[db] PostgreSQL unavailable:', lastError?.message)
  }

  // Fall back to SQLite
  if (!_fallbackAttempted) {
    _fallbackAttempted = true
    console.log('[db] Falling back to SQLite (local database)')
  }

  const localDb = getLocalDb()
  if (localDb) {
    _usingFallback = true
    _pgSeeded = true // prevent seeding attempts on pg-core schema
    return localDb as any
  }

  return null
}

export function isUsingLocalDb(): boolean {
  return _usingFallback
}

export async function closeDb() {
  if (_pgPool) {
    try {
      await _pgPool.end()
    } catch {
      // ignore close errors
    }
    _pgPool = null
    _pg = null
  }
  closeLocalDb()
  _usingFallback = false
  _fallbackAttempted = false
}

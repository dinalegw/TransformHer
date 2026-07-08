import { drizzle } from 'drizzle-orm/neon-serverless'
import { Pool, type PoolConfig } from '@neondatabase/serverless'
import * as schema from './schema'

const MAX_RETRIES = 3
const RETRY_DELAY_MS = 500

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null
let _pool: Pool | null = null
let _dbSeeded = false

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

export async function getDb() {
  if (_db) return _db

  const url = getConnectionUrl()
  if (!url) return null

  let lastError: Error | null = null

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const config = getPoolConfig()
      _pool = new Pool(config)

      const ready = await isPoolReady(_pool)
      if (!ready) {
        await _pool.end().catch(() => {})
        _pool = null
        throw new Error('Database connection timeout')
      }

      _db = drizzle(_pool, { schema })

      if (!_dbSeeded) {
        _dbSeeded = true
        const { seedDbAdmin } = await import('@/lib/auth')
        seedDbAdmin().catch(() => {})
        const { seedInitialBooks } = await import('@/lib/db/seed')
        seedInitialBooks().catch(() => {})
      }

      return _db
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      console.error(`[db] Connection attempt ${attempt}/${MAX_RETRIES} failed:`, lastError.message)

      if (_pool) {
        await _pool.end().catch(() => {})
        _pool = null
      }

      if (attempt < MAX_RETRIES) {
        await wait(RETRY_DELAY_MS * attempt)
      }
    }
  }

  console.error('[db] All connection attempts failed')
  return null
}

export async function closeDb() {
  if (_pool) {
    try {
      await _pool.end()
    } catch {
      // ignore close errors
    }
    _pool = null
    _db = null
  }
}

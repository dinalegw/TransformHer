import { drizzle } from 'drizzle-orm/neon-serverless'
import { Pool, type PoolConfig } from '@neondatabase/serverless'
import * as schema from './schema'

let _pg: ReturnType<typeof drizzle<typeof schema>> | null = null
let _pgPool: import('@neondatabase/serverless').Pool | null = null
let _pgSeeded = false
let _connecting = false
let _connectAttempts = 0
const MAX_RETRIES = 2

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

  return {
    connectionString: url,
    max: 1,
    idleTimeoutMillis: 3000,
    connectionTimeoutMillis: 3000,
  }
}

async function tryConnect(): Promise<ReturnType<typeof drizzle<typeof schema>> | null> {
  const url = getConnectionUrl()
  if (!url) return null

  const pool = new Pool(getPoolConfig())

  try {
    const client = await pool.connect()
    client.release()
    const db = drizzle(pool, { schema })
    _pgPool = pool
    return db
  } catch {
    await pool.end().catch(() => {})
    return null
  }
}

export async function getDb(): Promise<ReturnType<typeof drizzle<typeof schema>> | null> {
  if (_pg) return _pg
  if (_connecting) return null

  _connecting = true
  _connectAttempts++

  try {
    const pg = await tryConnect()
    if (pg) {
      _pg = pg
      _connectAttempts = 0

      if (!_pgSeeded) {
        _pgSeeded = true
        const { seedDbAdmin } = await import('@/lib/auth')
        seedDbAdmin().catch(() => {})
        const { seedInitialBooks } = await import('@/lib/db/seed')
        seedInitialBooks().catch(() => {})
      }

      return _pg
    }

    if (_connectAttempts >= MAX_RETRIES) {
      _connectAttempts = 0
    }

    return null
  } finally {
    _connecting = false
  }
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
  _pgSeeded = false
  _connectAttempts = 0
}

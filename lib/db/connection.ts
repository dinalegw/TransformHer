import { drizzle } from 'drizzle-orm/neon-serverless'
import { Pool } from '@neondatabase/serverless'
import * as schema from './schema'

function getConnectionUrl(): string | null {
  return process.env.POSTGRES_URL_NON_POOLING
    ?? process.env.POSTGRES_URL
    ?? process.env.DATABASE_URL_UNPOOLED
    ?? process.env.DATABASE_URL
    ?? null
}

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null
let _pool: Pool | null = null
let _dbSeeded = false

export function getDb() {
  if (_db) return _db

  const url = getConnectionUrl()
  if (!url) return null

  _pool = new Pool({ connectionString: url, max: 1 })
  _db = drizzle(_pool, { schema })

  if (!_dbSeeded) {
    _dbSeeded = true
    import('@/lib/auth').then(({ seedDbAdmin }) => seedDbAdmin()).catch(() => {})
  }

  return _db
}

export async function closeDb() {
  if (_pool) {
    await _pool.end()
    _pool = null
    _db = null
  }
}

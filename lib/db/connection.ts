import { drizzle } from 'drizzle-orm/neon-serverless'
import { sql } from 'drizzle-orm'
import { Pool, type PoolConfig } from '@neondatabase/serverless'
import * as schema from './schema'

let _pg: ReturnType<typeof drizzle<typeof schema>> | null = null
let _pgPool: import('@neondatabase/serverless').Pool | null = null
let _pgSeeded = false
let _connecting = false
let _connectAttempts = 0
const MAX_RETRIES = 2

async function ensureLegacySchema(db: ReturnType<typeof drizzle<typeof schema>>) {
  await db.execute(sql.raw(`DO $$ BEGIN CREATE TYPE "user_role" AS ENUM ('user', 'admin', 'master_admin'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;`))
  await db.execute(sql.raw(`DO $$ BEGIN CREATE TYPE "admin_rank" AS ENUM ('junior', 'senior', 'lead', 'master'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;`))
  await db.execute(sql.raw(`DO $$ BEGIN CREATE TYPE "book_source" AS ENUM ('seed', 'admin'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;`))
  await db.execute(sql`ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "role" "user_role" NOT NULL DEFAULT 'user', ADD COLUMN IF NOT EXISTS "rank" "admin_rank", ADD COLUMN IF NOT EXISTS "title" text, ADD COLUMN IF NOT EXISTS "permissions" text NOT NULL DEFAULT '[]', ADD COLUMN IF NOT EXISTS "token_version" integer NOT NULL DEFAULT 0;`)
  await db.execute(sql`ALTER TABLE "books" ADD COLUMN IF NOT EXISTS "file_url" text, ADD COLUMN IF NOT EXISTS "source" "book_source" NOT NULL DEFAULT 'seed', ADD COLUMN IF NOT EXISTS "archived" boolean NOT NULL DEFAULT false, ADD COLUMN IF NOT EXISTS "deleted" boolean NOT NULL DEFAULT false, ADD COLUMN IF NOT EXISTS "updated_at" timestamp NOT NULL DEFAULT now();`)
}

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
      await ensureLegacySchema(pg)
      _pg = pg
      _connectAttempts = 0

      if (!_pgSeeded) {
        _pgSeeded = true
        const { seedDbAdmin } = await import('@/lib/auth')
        await seedDbAdmin().catch(() => {})
        const { seedInitialBooks } = await import('@/lib/db/seed')
        await seedInitialBooks().catch(() => {})
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

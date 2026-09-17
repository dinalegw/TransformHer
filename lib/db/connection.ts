import { drizzle } from 'drizzle-orm/neon-serverless'
import { sql } from 'drizzle-orm'
import { Pool, type PoolConfig } from '@neondatabase/serverless'
import { getDatabaseConnection, getDbPoolMaxPerInstance } from '@/lib/scaling'
import * as schema from './schema'

type Db = ReturnType<typeof drizzle<typeof schema>>

let _pg: Db | null = null
let _pgPool: import('@neondatabase/serverless').Pool | null = null
let _pgSeeded = false
let _connectPromise: Promise<Db | null> | null = null
let _connectAttempts = 0
const MAX_RETRIES = 2

async function ensureLegacySchema(db: Db) {
  for (const statement of [
    `DO $$ BEGIN CREATE TYPE "user_role" AS ENUM ('user','admin','master_admin'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,
    `DO $$ BEGIN CREATE TYPE "admin_rank" AS ENUM ('junior','senior','lead','master'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,
    `DO $$ BEGIN CREATE TYPE "book_source" AS ENUM ('seed','admin'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,
    `DO $$ BEGIN CREATE TYPE "change_status" AS ENUM ('pending','approved','rejected'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,
    `DO $$ BEGIN CREATE TYPE "change_type" AS ENUM ('create','update','delete','archive'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,
    `DO $$ BEGIN CREATE TYPE "account_status" AS ENUM ('active','frozen','deletion_pending','archived'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,
  ]) {
    await db.execute(sql.raw(statement))
  }

  await db.execute(sql.raw(`ALTER TABLE "user"
    ADD COLUMN IF NOT EXISTS "email_verified" boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS "image" text,
    ADD COLUMN IF NOT EXISTS "password_hash" text,
    ADD COLUMN IF NOT EXISTS "is_admin" boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS "username" text,
    ADD COLUMN IF NOT EXISTS "phone" text,
    ADD COLUMN IF NOT EXISTS "show_full_name" boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS "role" "user_role" NOT NULL DEFAULT 'user',
    ADD COLUMN IF NOT EXISTS "rank" "admin_rank",
    ADD COLUMN IF NOT EXISTS "title" text,
    ADD COLUMN IF NOT EXISTS "permissions" text NOT NULL DEFAULT '[]',
    ADD COLUMN IF NOT EXISTS "token_version" integer NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "account_status" "account_status" NOT NULL DEFAULT 'active',
    ADD COLUMN IF NOT EXISTS "frozen_at" timestamp,
    ADD COLUMN IF NOT EXISTS "frozen_by" text,
    ADD COLUMN IF NOT EXISTS "freeze_reason" text,
    ADD COLUMN IF NOT EXISTS "deletion_requested_at" timestamp,
    ADD COLUMN IF NOT EXISTS "archived_at" timestamp,
    ADD COLUMN IF NOT EXISTS "created_at" timestamp NOT NULL DEFAULT now(),
    ADD COLUMN IF NOT EXISTS "updated_at" timestamp NOT NULL DEFAULT now();`))

  for (const statement of [
    `CREATE UNIQUE INDEX IF NOT EXISTS "user_email_idx" ON "user"("email");`,
    `CREATE INDEX IF NOT EXISTS "user_role_idx" ON "user"("role");`,
    `CREATE INDEX IF NOT EXISTS "user_token_version_idx" ON "user"("token_version");`,
    `CREATE INDEX IF NOT EXISTS "user_account_status_idx" ON "user"("account_status");`,
  ]) {
    await db.execute(sql.raw(statement))
  }

  await db.execute(sql.raw(`ALTER TABLE "books"
    ADD COLUMN IF NOT EXISTS "file_url" text,
    ADD COLUMN IF NOT EXISTS "tagline" text NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS "description" text NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS "rating" numeric(2,1) NOT NULL DEFAULT '5.0',
    ADD COLUMN IF NOT EXISTS "reviews_count" integer NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "pages" integer NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "featured" boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS "bestseller" boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS "source" "book_source" NOT NULL DEFAULT 'seed',
    ADD COLUMN IF NOT EXISTS "archived" boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS "deleted" boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS "updated_at" timestamp NOT NULL DEFAULT now();`))

  await db.execute(sql.raw(`CREATE TABLE IF NOT EXISTS "user_purchases"(
    "id" serial PRIMARY KEY,
    "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE cascade,
    "book_id" integer NOT NULL REFERENCES "books"("id") ON DELETE cascade,
    "book_slug" text NOT NULL,
    "purchase_date" timestamp NOT NULL DEFAULT now(),
    "payment_reference" text,
    "released" boolean NOT NULL DEFAULT false,
    "release_at" timestamp,
    "archived" boolean NOT NULL DEFAULT false
  );`))

  await db.execute(sql.raw(`CREATE TABLE IF NOT EXISTS "cart"(
    "id" serial PRIMARY KEY,
    "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE cascade,
    "book_id" integer NOT NULL REFERENCES "books"("id") ON DELETE cascade,
    "added_at" timestamp NOT NULL DEFAULT now()
  );`))

  await db.execute(sql.raw(`CREATE TABLE IF NOT EXISTS "pending_changes"(
    "id" text PRIMARY KEY,
    "book_slug" text NOT NULL,
    "book_title" text NOT NULL,
    "type" "change_type" NOT NULL,
    "changes" text NOT NULL DEFAULT '{}',
    "submitted_by" text NOT NULL,
    "submitted_by_email" text NOT NULL,
    "submitted_at" timestamp NOT NULL DEFAULT now(),
    "status" "change_status" NOT NULL DEFAULT 'pending',
    "reviewed_by" text,
    "reviewed_at" timestamp
  );`))

  await db.execute(sql.raw(`CREATE TABLE IF NOT EXISTS "deleted_user_archives"(
    "id" text PRIMARY KEY,
    "original_user_id" text NOT NULL,
    "original_email" text NOT NULL,
    "original_name" text NOT NULL,
    "username" text,
    "phone" text,
    "account_created_at" timestamp,
    "account_deleted_at" timestamp NOT NULL,
    "deletion_type" text NOT NULL,
    "deleted_by" text,
    "deletion_reason" text,
    "account_status_at_deletion" text,
    "email_verified" boolean NOT NULL DEFAULT false,
    "purchase_snapshot" text NOT NULL DEFAULT '[]',
    "retention_reason" text NOT NULL,
    "retention_expires_at" timestamp NOT NULL,
    "legal_hold" boolean NOT NULL DEFAULT false,
    "legal_hold_reference" text,
    "created_at" timestamp NOT NULL DEFAULT now()
  );`))

  for (const statement of [
    `CREATE INDEX IF NOT EXISTS "books_category_idx" ON "books"("category");`,
    `CREATE INDEX IF NOT EXISTS "books_featured_idx" ON "books"("featured");`,
    `CREATE INDEX IF NOT EXISTS "books_bestseller_idx" ON "books"("bestseller");`,
    `CREATE INDEX IF NOT EXISTS "books_source_idx" ON "books"("source");`,
    `CREATE INDEX IF NOT EXISTS "books_featured_bestseller_idx" ON "books"("featured","bestseller");`,
    `CREATE INDEX IF NOT EXISTS "books_active_idx" ON "books"("deleted","archived");`,
    `CREATE INDEX IF NOT EXISTS "purchases_user_idx" ON "user_purchases"("user_id");`,
    `CREATE INDEX IF NOT EXISTS "purchases_book_idx" ON "user_purchases"("book_id");`,
    `CREATE INDEX IF NOT EXISTS "purchases_slug_idx" ON "user_purchases"("book_slug");`,
    `CREATE INDEX IF NOT EXISTS "purchases_release_idx" ON "user_purchases"("released","release_at");`,
    `CREATE INDEX IF NOT EXISTS "purchases_payment_reference_idx" ON "user_purchases"("payment_reference");`,
    `CREATE INDEX IF NOT EXISTS "cart_user_idx" ON "cart"("user_id");`,
    `CREATE INDEX IF NOT EXISTS "cart_book_idx" ON "cart"("book_id");`,
    `CREATE INDEX IF NOT EXISTS "pending_changes_status_idx" ON "pending_changes"("status");`,
    `CREATE INDEX IF NOT EXISTS "pending_changes_slug_idx" ON "pending_changes"("book_slug");`,
    `CREATE INDEX IF NOT EXISTS "pending_changes_submitted_by_idx" ON "pending_changes"("submitted_by");`,
    `CREATE INDEX IF NOT EXISTS "deleted_user_original_user_idx" ON "deleted_user_archives"("original_user_id");`,
    `CREATE INDEX IF NOT EXISTS "deleted_user_email_idx" ON "deleted_user_archives"("original_email");`,
    `CREATE INDEX IF NOT EXISTS "deleted_user_deleted_at_idx" ON "deleted_user_archives"("account_deleted_at");`,
    `CREATE INDEX IF NOT EXISTS "deleted_user_retention_idx" ON "deleted_user_archives"("retention_expires_at","legal_hold");`,
  ]) {
    await db.execute(sql.raw(statement))
  }

  // Legacy installations may already contain duplicate rows. Never make a cold
  // start fail by blindly adding a unique index; add it only when the data is safe.
  await db.execute(sql.raw(`DO $$ BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM "user_purchases" GROUP BY "user_id", "book_id" HAVING count(*) > 1
    ) THEN
      EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS "purchases_user_book_idx" ON "user_purchases"("user_id","book_id")';
    END IF;
  END $$;`))

  await db.execute(sql.raw(`DO $$ BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM "cart" GROUP BY "user_id", "book_id" HAVING count(*) > 1
    ) THEN
      EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS "cart_user_book_idx" ON "cart"("user_id","book_id")';
    END IF;
  END $$;`))
}

function getConnectionUrl() {
  return getDatabaseConnection().url
}

function getPoolConfig(): PoolConfig {
  const url = getConnectionUrl()
  if (!url) return { connectionString: '', max: 0 }
  return {
    connectionString: url,
    max: getDbPoolMaxPerInstance(),
    idleTimeoutMillis: 3000,
    connectionTimeoutMillis: 3000,
  }
}

async function tryConnect(): Promise<Db | null> {
  const connection = getDatabaseConnection()
  const url = connection.url
  if (!url) {
    console.error('[db] No database connection URL is configured')
    return null
  }

  if (process.env.NODE_ENV === 'production' && !connection.pooledPreferred) {
    console.warn(`[db] Using ${connection.source}; configure a pooled database URL for safer horizontal scaling`)
  }

  const pool = new Pool(getPoolConfig())
  try {
    const client = await pool.connect()
    client.release()
    const db = drizzle(pool, { schema })
    _pgPool = pool
    return db
  } catch (error) {
    console.error('[db] Connection failed', error)
    await pool.end().catch(() => {})
    return null
  }
}

async function establishConnection(): Promise<Db | null> {
  _connectAttempts += 1
  const pg = await tryConnect()

  if (!pg) {
    if (_connectAttempts >= MAX_RETRIES) _connectAttempts = 0
    return null
  }

  try {
    await ensureLegacySchema(pg)
    _pg = pg
    _connectAttempts = 0

    if (!_pgSeeded) {
      _pgSeeded = true
      const { seedDbAdmin } = await import('@/lib/auth')
      await seedDbAdmin().catch((error) => console.error('[db] Admin seed failed', error))
      const { seedInitialBooks } = await import('@/lib/db/seed')
      await seedInitialBooks().catch((error) => console.error('[db] Book seed failed', error))
    }

    return _pg
  } catch (error) {
    console.error('[db] Schema initialization failed', error)
    if (_pgPool) {
      await _pgPool.end().catch(() => {})
      _pgPool = null
    }
    _pg = null
    return null
  }
}

export async function getDb(): Promise<Db | null> {
  if (_pg) return _pg
  if (_connectPromise) return _connectPromise

  _connectPromise = establishConnection()
  try {
    return await _connectPromise
  } finally {
    _connectPromise = null
  }
}

export async function closeDb() {
  if (_pgPool) {
    try {
      await _pgPool.end()
    } catch {
      // Ignore shutdown errors.
    }
  }
  _pgPool = null
  _pg = null
  _pgSeeded = false
  _connectAttempts = 0
  _connectPromise = null
}

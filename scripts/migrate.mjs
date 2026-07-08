import { sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/neon-serverless'
import { Pool } from '@neondatabase/serverless'
import { readFileSync, readdirSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const MIGRATIONS_DIR = join(__dirname, '..', 'drizzle')

const connectionString = process.env.POSTGRES_URL_NON_POOLING
  ?? process.env.POSTGRES_URL
  ?? process.env.DATABASE_URL_UNPOOLED
  ?? process.env.DATABASE_URL
  ?? null

if (!connectionString) {
  console.error('Missing POSTGRES_URL or DATABASE_URL environment variable')
  process.exit(1)
}

async function migrate() {
  const pool = new Pool({ connectionString })
  const db = drizzle(pool)

  // Create migrations tracking table if not exists
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS _drizzle_migrations (
      id SERIAL PRIMARY KEY,
      hash TEXT NOT NULL UNIQUE,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `)

  // Find all migration files
  if (!existsSync(MIGRATIONS_DIR)) {
    console.error('No migrations directory found at', MIGRATIONS_DIR)
    await pool.end()
    process.exit(1)
  }

  const files = readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort()

  if (files.length === 0) {
    console.log('No migration files found')
    await pool.end()
    return
  }

  // Get applied migrations
  const applied = await db.execute<{ hash: string }>(sql`
    SELECT hash FROM _drizzle_migrations ORDER BY id;
  `)
  const appliedHashes = new Set(applied.rows?.map(r => r.hash) ?? [])

  for (const file of files) {
    const hash = file.replace(/\.sql$/, '')
    if (appliedHashes.has(hash)) {
      console.log(`[skip] ${file} — already applied`)
      continue
    }

    const sqlContent = readFileSync(join(MIGRATIONS_DIR, file), 'utf-8')
    const statements = sqlContent
      .split('--> statement-breakpoint')
      .map(s => s.trim())
      .filter(Boolean)

    console.log(`[run] ${file} — ${statements.length} statements`)

    for (const stmt of statements) {
      try {
        await db.execute(sql.raw(stmt))
      } catch (err) {
        console.error(`[error] Failed statement in ${file}:`, err instanceof Error ? err.message : err)
        await pool.end()
        process.exit(1)
      }
    }

    await db.execute(sql`
      INSERT INTO _drizzle_migrations (hash) VALUES (${hash});
    `)
  }

  console.log('All migrations applied successfully')
  await pool.end()
}

migrate().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})

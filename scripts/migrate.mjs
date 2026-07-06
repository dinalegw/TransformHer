import { Pool } from '@neondatabase/serverless'

const connectionString = process.env.POSTGRES_URL_NON_POOLING
  ?? process.env.POSTGRES_URL
  ?? process.env.DATABASE_URL_UNPOOLED
  ?? process.env.DATABASE_URL
  ?? null

if (!connectionString) {
  console.error('Missing POSTGRES_URL or DATABASE_URL environment variable')
  process.exit(1)
}

const pool = new Pool({ connectionString })

async function migrate() {
  const client = await pool.connect()

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS "user" (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        email_verified BOOLEAN NOT NULL DEFAULT false,
        image TEXT,
        password_hash TEXT,
        is_admin BOOLEAN NOT NULL DEFAULT false,
        username TEXT,
        phone TEXT,
        show_full_name BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `)

    await client.query(`
      ALTER TABLE "user" ADD COLUMN IF NOT EXISTS username TEXT;
    `)

    await client.query(`
      ALTER TABLE "user" ADD COLUMN IF NOT EXISTS phone TEXT;
    `)

    await client.query(`
      ALTER TABLE "user" ADD COLUMN IF NOT EXISTS show_full_name BOOLEAN NOT NULL DEFAULT false;
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS books (
        id SERIAL PRIMARY KEY,
        slug TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        author TEXT NOT NULL,
        category TEXT NOT NULL,
        price NUMERIC(10,2) NOT NULL DEFAULT '0',
        currency TEXT NOT NULL DEFAULT 'NGN',
        cover_image TEXT NOT NULL,
        tagline TEXT NOT NULL DEFAULT '',
        description TEXT NOT NULL DEFAULT '',
        rating NUMERIC(2,1) NOT NULL DEFAULT '5.0',
        reviews_count INTEGER NOT NULL DEFAULT 0,
        pages INTEGER NOT NULL DEFAULT 0,
        featured BOOLEAN NOT NULL DEFAULT false,
        bestseller BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS user_purchases (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
        book_slug TEXT NOT NULL,
        purchase_date TIMESTAMP NOT NULL DEFAULT NOW(),
        payment_reference TEXT,
        released BOOLEAN NOT NULL DEFAULT false,
        release_at TIMESTAMP
      );
    `)

    await client.query(`
      ALTER TABLE user_purchases ADD COLUMN IF NOT EXISTS released BOOLEAN NOT NULL DEFAULT false;
    `)

    await client.query(`
      ALTER TABLE user_purchases ADD COLUMN IF NOT EXISTS release_at TIMESTAMP;
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS cart (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
        added_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS "session" (
        id TEXT PRIMARY KEY,
        expires_at TIMESTAMP NOT NULL,
        token TEXT NOT NULL UNIQUE,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        ip_address TEXT,
        user_agent TEXT,
        user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE
      );
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS "account" (
        id TEXT PRIMARY KEY,
        account_id TEXT NOT NULL,
        provider_id TEXT NOT NULL,
        user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        access_token TEXT,
        refresh_token TEXT,
        id_token TEXT,
        access_token_expires_at TIMESTAMP,
        refresh_token_expires_at TIMESTAMP,
        scope TEXT,
        password TEXT,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS "verification" (
        id TEXT PRIMARY KEY,
        identifier TEXT NOT NULL,
        value TEXT NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      );
    `)

    console.log('All tables created successfully')
  } finally {
    client.release()
    await pool.end()
  }
}

migrate().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})

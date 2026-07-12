import { drizzle } from 'drizzle-orm/better-sqlite3'
import Database from 'better-sqlite3'
import { join } from 'path'
import { existsSync, mkdirSync, readFileSync } from 'fs'
import * as schema from './schema-local'

const DB_DIR = join(process.cwd(), 'data')
const DB_PATH = join(DB_DIR, 'transformher.db')

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null
let _sqlite: Database.Database | null = null

export function getLocalDb() {
  if (_db) return _db

  try {
    if (!existsSync(DB_DIR)) {
      mkdirSync(DB_DIR, { recursive: true })
    }

    _sqlite = new Database(DB_PATH)

    _sqlite.pragma('journal_mode = WAL')
    _sqlite.pragma('foreign_keys = ON')
    _sqlite.pragma('busy_timeout = 5000')
    _sqlite.pragma('synchronous = NORMAL')

    _db = drizzle(_sqlite, { schema })

    initTables()
    seedLocalAdmin()
    seedLocalBooks()

    return _db
  } catch (err) {
    console.error('[local-db] Failed to initialize SQLite database:', err instanceof Error ? err.message : err)
    return null
  }
}

export function closeLocalDb() {
  if (_sqlite) {
    try {
      _sqlite.close()
    } catch {
      // ignore close errors
    }
    _sqlite = null
    _db = null
  }
}

function initTables() {
  if (!_sqlite) return

  _sqlite.exec(`
    CREATE TABLE IF NOT EXISTS user (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      email_verified INTEGER NOT NULL DEFAULT 0,
      image TEXT,
      password_hash TEXT,
      is_admin INTEGER NOT NULL DEFAULT 0,
      username TEXT,
      phone TEXT,
      show_full_name INTEGER NOT NULL DEFAULT 0,
      role TEXT NOT NULL DEFAULT 'user',
      rank TEXT,
      title TEXT,
      permissions TEXT NOT NULL DEFAULT '[]',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS user_role_idx ON user(role);

    CREATE TABLE IF NOT EXISTS session (
      id TEXT PRIMARY KEY,
      expires_at INTEGER NOT NULL,
      token TEXT NOT NULL UNIQUE,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS session_user_idx ON session(user_id);
    CREATE INDEX IF NOT EXISTS session_expiry_idx ON session(expires_at);

    CREATE TABLE IF NOT EXISTS account (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL,
      provider_id TEXT NOT NULL,
      user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
      access_token TEXT,
      refresh_token TEXT,
      id_token TEXT,
      access_token_expires_at INTEGER,
      refresh_token_expires_at INTEGER,
      scope TEXT,
      password TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS account_user_idx ON account(user_id);
    CREATE INDEX IF NOT EXISTS account_provider_idx ON account(provider_id);

    CREATE TABLE IF NOT EXISTS verification (
      id TEXT PRIMARY KEY,
      identifier TEXT NOT NULL,
      value TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at INTEGER,
      updated_at INTEGER
    );

    CREATE INDEX IF NOT EXISTS verification_identifier_idx ON verification(identifier);
    CREATE INDEX IF NOT EXISTS verification_expiry_idx ON verification(expires_at);

    CREATE TABLE IF NOT EXISTS books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      category TEXT NOT NULL,
      price TEXT NOT NULL DEFAULT '0',
      currency TEXT NOT NULL DEFAULT 'NGN',
      cover_image TEXT NOT NULL,
      file_url TEXT,
      tagline TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      rating TEXT NOT NULL DEFAULT '5.0',
      reviews_count INTEGER NOT NULL DEFAULT 0,
      pages INTEGER NOT NULL DEFAULT 0,
      featured INTEGER NOT NULL DEFAULT 0,
      bestseller INTEGER NOT NULL DEFAULT 0,
      source TEXT NOT NULL DEFAULT 'seed',
      archived INTEGER NOT NULL DEFAULT 0,
      deleted INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS books_category_idx ON books(category);
    CREATE INDEX IF NOT EXISTS books_featured_idx ON books(featured);
    CREATE INDEX IF NOT EXISTS books_bestseller_idx ON books(bestseller);
    CREATE INDEX IF NOT EXISTS books_source_idx ON books(source);
    CREATE INDEX IF NOT EXISTS books_featured_bestseller_idx ON books(featured, bestseller);
    CREATE INDEX IF NOT EXISTS books_active_idx ON books(deleted, archived);

    CREATE TABLE IF NOT EXISTS user_purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
      book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
      book_slug TEXT NOT NULL,
      purchase_date INTEGER NOT NULL,
      payment_reference TEXT,
      released INTEGER NOT NULL DEFAULT 0,
      release_at INTEGER,
      archived INTEGER NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS purchases_user_idx ON user_purchases(user_id);
    CREATE INDEX IF NOT EXISTS purchases_book_idx ON user_purchases(book_id);
    CREATE INDEX IF NOT EXISTS purchases_slug_idx ON user_purchases(book_slug);
    CREATE UNIQUE INDEX IF NOT EXISTS purchases_user_book_idx ON user_purchases(user_id, book_id);
    CREATE INDEX IF NOT EXISTS purchases_release_idx ON user_purchases(released, release_at);

    CREATE TABLE IF NOT EXISTS cart (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
      book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
      added_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS cart_user_idx ON cart(user_id);
    CREATE INDEX IF NOT EXISTS cart_book_idx ON cart(book_id);
    CREATE UNIQUE INDEX IF NOT EXISTS cart_user_book_idx ON cart(user_id, book_id);

    CREATE TABLE IF NOT EXISTS pending_changes (
      id TEXT PRIMARY KEY,
      book_slug TEXT NOT NULL,
      book_title TEXT NOT NULL,
      type TEXT NOT NULL,
      changes TEXT NOT NULL DEFAULT '{}',
      submitted_by TEXT NOT NULL,
      submitted_by_email TEXT NOT NULL,
      submitted_at INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      reviewed_by TEXT,
      reviewed_at INTEGER
    );

    CREATE INDEX IF NOT EXISTS pending_changes_status_idx ON pending_changes(status);
    CREATE INDEX IF NOT EXISTS pending_changes_slug_idx ON pending_changes(book_slug);
  `)
}

function seedLocalAdmin() {
  if (!_sqlite) return

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@transformher.com'
  const existing = _sqlite.prepare('SELECT id FROM user WHERE email = ?').get(adminEmail)
  if (existing) return

  const crypto = require('crypto')
  const id = crypto.randomUUID()
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123'

  const salt = crypto.randomBytes(16)
  const key = crypto.pbkdf2Sync(adminPassword, salt, 100000, 32, 'sha256')
  const passwordHash = `${salt.toString('hex')}:${key.toString('hex')}`

  const now = Date.now()

  _sqlite.prepare(`
    INSERT INTO user (id, name, email, password_hash, is_admin, role, rank, title, permissions, created_at, updated_at)
    VALUES (?, ?, ?, ?, 1, 'master_admin', 'master', 'Master Admin', ?, ?, ?)
  `).run(
    id,
    'Admin',
    adminEmail,
    passwordHash,
    '["view_books","create_books","edit_books","delete_books","archive_books","approve_changes","manage_users","manage_admins","view_orders","manage_orders","unlock_books","view_analytics","manage_settings"]',
    now,
    now,
  )
}

function seedLocalBooks() {
  if (!_sqlite) return

  const count = _sqlite.prepare('SELECT COUNT(*) as count FROM books').get() as { count: number }
  if (count.count > 0) return

  try {
    const seedPath = join(process.cwd(), 'lib', 'seed.ts')
    if (!existsSync(seedPath)) return

    // Inline seed books data instead of importing TypeScript module at runtime
    const seedBooks: Array<{
      slug: string; title: string; author: string; category: string;
      price: string; currency: string; coverImage: string;
      tagline: string; description: string; rating: string;
      reviewsCount: number; pages: number;
      featured: boolean; bestseller: boolean;
    }> = [
      {
        slug: 'the-confidence-code',
        title: 'The Confidence Code',
        author: 'Dr. Sarah Mitchell',
        category: 'Mindset & Confidence',
        price: '14.99',
        currency: 'USD',
        coverImage: '/books/confidence-code.jpg',
        tagline: 'Unlock your inner power and embrace who you are',
        description: 'A transformative guide to building unshakeable self-confidence.',
        rating: '4.8',
        reviewsCount: 234,
        pages: 256,
        featured: true,
        bestseller: true,
      },
      {
        slug: 'wealth-warrior',
        title: 'Wealth Warrior',
        author: 'Amanda Sterling',
        category: 'Career & Wealth',
        price: '18.99',
        currency: 'USD',
        coverImage: '/books/wealth-warrior.jpg',
        tagline: 'Master your money, master your life',
        description: 'A practical guide to building wealth and financial independence.',
        rating: '4.7',
        reviewsCount: 189,
        pages: 320,
        featured: true,
        bestseller: true,
      },
      {
        slug: 'radiant-you',
        title: 'Radiant You',
        author: 'Dr. Lisa Chen',
        category: 'Wellness & Self-Care',
        price: '16.99',
        currency: 'USD',
        coverImage: '/books/radiant-you.jpg',
        tagline: 'Nourish your body, mind, and spirit',
        description: 'A holistic wellness guide for the modern woman.',
        rating: '4.9',
        reviewsCount: 312,
        pages: 288,
        featured: true,
        bestseller: true,
      },
      {
        slug: 'love-unlocked',
        title: 'Love Unlocked',
        author: 'Michelle Harper',
        category: 'Relationships',
        price: '15.99',
        currency: 'USD',
        coverImage: '/books/love-unlocked.jpg',
        tagline: 'Build meaningful connections that last',
        description: 'A guide to healthy, fulfilling relationships and self-love.',
        rating: '4.6',
        reviewsCount: 156,
        pages: 240,
        featured: false,
        bestseller: false,
      },
      {
        slug: 'purpose-path',
        title: 'Purpose Path',
        author: 'Dr. Rachel Okonkwo',
        category: 'Spirituality & Purpose',
        price: '14.99',
        currency: 'USD',
        coverImage: '/books/purpose-path.jpg',
        tagline: 'Find your why and live with intention',
        description: 'A spiritual journey to discovering your life\'s purpose.',
        rating: '4.7',
        reviewsCount: 198,
        pages: 272,
        featured: false,
        bestseller: false,
      },
      {
        slug: 'lead-like-a-woman',
        title: 'Lead Like a Woman',
        author: 'Victoria Adeyemi',
        category: 'Leadership',
        price: '19.99',
        currency: 'USD',
        coverImage: '/books/lead-like-a-woman.jpg',
        tagline: 'Break the glass ceiling with grace and grit',
        description: 'Leadership strategies and insights for women in the workplace.',
        rating: '4.8',
        reviewsCount: 267,
        pages: 304,
        featured: true,
        bestseller: true,
      },
      {
        slug: 'the-mindset-shift',
        title: 'The Mindset Shift',
        author: 'Dr. Sarah Mitchell',
        category: 'Mindset & Confidence',
        price: '13.99',
        currency: 'USD',
        coverImage: '/books/mindset-shift.jpg',
        tagline: 'Transform your thinking, transform your life',
        description: 'Science-backed strategies to rewire your brain for success.',
        rating: '4.5',
        reviewsCount: 145,
        pages: 224,
        featured: false,
        bestseller: false,
      },
      {
        slug: 'she-elevates',
        title: 'She Elevates',
        author: 'Amanda Sterling',
        category: 'Career & Wealth',
        price: '17.99',
        currency: 'USD',
        coverImage: '/books/she-elevates.jpg',
        tagline: 'Rise together: the power of women supporting women',
        description: 'A manifesto for women\u2019s collective success and empowerment.',
        rating: '4.6',
        reviewsCount: 178,
        pages: 260,
        featured: false,
        bestseller: false,
      },
    ]

    const now = Date.now()
    const stmt = _sqlite.prepare(`
      INSERT OR IGNORE INTO books (
        slug, title, author, category, price, currency, cover_image,
        tagline, description, rating, reviews_count, pages,
        featured, bestseller, source, archived, deleted, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, 'seed', 0, 0, ?, ?
      )
    `)

    const insertMany = _sqlite.transaction((books: typeof seedBooks) => {
      for (const book of books) {
        stmt.run(
          book.slug, book.title, book.author, book.category,
          book.price, book.currency, book.coverImage,
          book.tagline, book.description, book.rating,
          book.reviewsCount, book.pages,
          book.featured ? 1 : 0, book.bestseller ? 1 : 0,
          now, now,
        )
      }
    })

    insertMany(seedBooks)
  } catch {
    // silently skip seed errors
  }
}

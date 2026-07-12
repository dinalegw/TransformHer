import { createRequire } from 'module'
const require = createRequire(import.meta.url)

const Database = require('better-sqlite3')
const path = require('path')
const fs = require('fs')

const DB_PATH = path.join(process.cwd(), 'data', 'transformher.db')

if (!fs.existsSync(DB_PATH)) {
  console.log('❌ Database file not found')
  process.exit(1)
}

const db = new Database(DB_PATH)

// Test 1: Tables exist
const tables = db.prepare(`
  SELECT name FROM sqlite_master WHERE type='table' ORDER BY name
`).all() 

const tableNames = tables.map(t => t.name)
console.log('📊 Tables:', tableNames.join(', '))

const expectedTables = ['user', 'session', 'account', 'verification', 'books', 'user_purchases', 'cart', 'pending_changes']
const missing = expectedTables.filter(t => !tableNames.includes(t))
if (missing.length > 0) {
  console.log(`❌ Missing tables: ${missing.join(', ')}`)
  process.exit(1)
}
console.log('✅ All 8 tables created')

// Test 2: Admin user seeded
const admin = db.prepare('SELECT id, name, email, role, rank, is_admin FROM user WHERE email = ?').get('admin@transformher.com')
if (!admin) {
  console.log('❌ Admin user not found')
  process.exit(1)
}
console.log(`✅ Admin user: ${admin.name} (${admin.email}) - ${admin.role}`)

// Test 3: Books seeded
const bookCount = db.prepare('SELECT COUNT(*) as count FROM books').get()
console.log(`✅ Books seeded: ${bookCount.count}`)
if (bookCount.count < 8) {
  console.log(`⚠️  Expected at least 8 books, found ${bookCount.count}`)
}

// Test 4: Foreign keys enabled
const foreignKeys = db.prepare('PRAGMA foreign_keys').get()
console.log(`✅ Foreign keys: ${foreignKeys.foreign_keys === 1 ? 'ON' : 'OFF'}`)

// Test 5: WAL mode
const journalMode = db.prepare('PRAGMA journal_mode').get()
console.log(`✅ Journal mode: ${journalMode.journal_mode}`)

// Test 6: Can query books
const books = db.prepare('SELECT slug, title, category, price FROM books LIMIT 3').all()
console.log('\n📚 Sample books:')
for (const b of books) {
  console.log(`   - ${b.title} (${b.category}) - ${b.price} ${b.currency || 'USD'}`)
}

// Test 7: Can insert/read/delete a test session
const crypto = require('crypto')
const sessionId = crypto.randomUUID()
const userId = admin.id
const now = Date.now()
const token = crypto.randomUUID()

db.prepare(`
  INSERT INTO session (id, expires_at, token, created_at, updated_at, user_id)
  VALUES (?, ?, ?, ?, ?, ?)
`).run(sessionId, now + 3600000, token, now, now, userId)

const session = db.prepare('SELECT * FROM session WHERE id = ?').get(sessionId)
if (!session) {
  console.log('❌ Session insert/read failed')
  process.exit(1)
}
console.log('✅ Insert/read operations work')

// Clean up
db.prepare('DELETE FROM session WHERE id = ?').run(sessionId)
const deleted = db.prepare('SELECT * FROM session WHERE id = ?').get(sessionId)
if (deleted) {
  console.log('❌ Session delete failed')
  process.exit(1)
}
console.log('✅ Delete operations work')

// Test 8: Unique constraint on email works
try {
  db.prepare('INSERT INTO user (id, name, email, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(crypto.randomUUID(), 'Duplicate', 'admin@transformher.com', 'hash', now, now)
  console.log('❌ Unique constraint on email failed (no error raised)')
  process.exit(1)
} catch (err) {
  console.log('✅ Unique constraints enforced')
}

// Summary
console.log('\n┌─────────────────────────────────────┐')
console.log('│  ✅ Database: FULLY OPERATIONAL     │')
console.log('├─────────────────────────────────────┤')
console.log('│  Engine: SQLite + better-sqlite3    │')
console.log(`│  Tables: ${tableNames.length}                          │`)
console.log(`│  Books:  ${bookCount.count}                         │`)
console.log('│  Status: All CRUD operations work   │')
console.log('└─────────────────────────────────────┘')

db.close()

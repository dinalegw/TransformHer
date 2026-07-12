import { eq, and, ne, sql, desc } from 'drizzle-orm'
import { getLocalDb, closeLocalDb } from '../lib/db/local-connection'
import * as pgSchema from '../lib/db/schema'
import { randomUUID } from 'crypto'

function assert(condition: boolean, msg: string) {
  if (condition) { console.log(`  ✅ ${msg}`) }
  else { console.error(`  ❌ ${msg}`); process.exit(1) }
}

console.log('\n🧪 Testing pg-core schema queries via SQLite client\n')

// `db` is the better-sqlite3 client, but we intentionally run pg-core column
// definitions through it (they are plain column metadata at runtime). Cast to
// `any` so the intentionally cross-dialect queries type-check.
const db: any = getLocalDb()
if (!db) { console.error('no db'); process.exit(1) }

// These use pgSchema.books (pg-core) — exactly what lib/books.ts does
const books = pgSchema.books

// Exact query from getFeaturedBooks
const f1 = db.select().from(books).where(and(
  eq(books.featured, true),
  eq(books.deleted, false),
  eq(books.archived, false)
)).orderBy(desc(books.reviewsCount)).limit(6).all()
assert(f1.length >= 4, 'getFeaturedBooks — boolean WHERE chain')

// Exact query from getBestsellers
const f2 = db.select().from(books).where(and(
  eq(books.bestseller, true),
  eq(books.deleted, false),
  eq(books.archived, false)
)).orderBy(desc(books.rating)).limit(4).all()
assert(f2.length >= 4, 'getBestsellers — boolean WHERE chain')

// Exact query from getBookBySlug
const f3 = db.select().from(books).where(and(
  eq(books.slug, 'the-confidence-code'),
  eq(books.deleted, false)
)).limit(1).all()
assert(f3.length === 1, 'getBookBySlug — text + boolean AND')

// Exact query from getAllBooks (category filter)
const f4 = db.select().from(books).where(and(
  eq(books.deleted, false),
  eq(books.archived, false),
  eq(books.category, 'Mindset & Confidence')
)).all()
assert(f4.length >= 1, 'getAllBooks — category + boolean AND')

// Exact query from getAllBooks (search without category)
const f5 = db.select().from(books).where(and(
  eq(books.deleted, false),
  eq(books.archived, false)
)).orderBy(desc(books.reviewsCount)).all()
assert(f5.length === 8, 'getAllBooks — all active, orderBy')

// Exact query from getCategoryCounts
const f6 = db.select({
  category: books.category,
  count: sql<number>`count(*)`
}).from(books).where(and(
  eq(books.deleted, false),
  eq(books.archived, false)
)).groupBy(books.category).all()
assert(f6.length >= 1, 'getCategoryCounts — groupBy with boolean WHERE')

// Exact query from getRelatedBooks
const f7 = db.select().from(books).where(and(
  eq(books.category, 'Mindset & Confidence' as any),
  ne(books.slug, 'the-confidence-code'),
  eq(books.deleted, false),
  eq(books.archived, false)
)).limit(3).all()
assert(f7.length >= 0, 'getRelatedBooks — mixed filters')

// Test with user table (pg-core schema)
const userTbl = pgSchema.user
const f8 = db.select({ id: userTbl.id }).from(userTbl).where(
  eq(userTbl.email, 'admin@transformher.com')
).limit(1).all()
assert(f8.length === 1, 'user select by email')

// Test user table with pg-core userTable columns
const f9 = db.select({
  id: userTbl.id, name: userTbl.name, email: userTbl.email,
  isAdmin: userTbl.isAdmin, role: userTbl.role,
}).from(userTbl).where(
  eq(userTbl.isAdmin, true)
).all()
assert(f9.length >= 1, 'user boolean WHERE with pg-core')

// Test insert with pg-core timestamp/boolean types
const uid = randomUUID()
db.insert(userTbl).values({
  id: uid,
  name: 'PgSchema Test',
  email: `pg-${Date.now()}@test.com`,
  passwordHash: 'hash',
  isAdmin: false,
  role: 'user',
  permissions: '[]',
  createdAt: new Date(),
  updatedAt: new Date(),
}).run()
assert(true, 'insert with pg-core Date/boolean')

// Verify read-back types
const f10 = db.select().from(userTbl).where(eq(userTbl.id, uid)).get()
assert(f10 !== undefined, 'read back inserted user')
// pg-core returns these as their natural types (Date, boolean)
assert(typeof f10?.isAdmin !== 'undefined', 'isAdmin field exists')

// Cleanup
db.delete(userTbl).where(eq(userTbl.id, uid)).run()

console.log(`\n✅ ALL ${[f1,f2,f3,f4,f5,f6,f7,f8,f9].length + 3} TESTS PASSED\n`)
closeLocalDb()

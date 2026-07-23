import 'server-only'
import { eq, and, desc, asc, sql, ne } from 'drizzle-orm'
import { getDb } from '@/lib/db/connection'
import { books, type Book } from '@/lib/db/schema'
import { cacheWrapper } from '@/lib/db/cache'
import { CATEGORIES } from '@/lib/constants'

export { CATEGORIES }

export type { Book }

const CACHE_PREFIX = 'books'

function matchesQuery(book: { title: string; author: string; tagline?: string | null }, q: string): boolean {
  const query = q.toLowerCase()
  const tagline = book.tagline ?? ''
  return (
    book.title.toLowerCase().includes(query) ||
    book.author.toLowerCase().includes(query) ||
    tagline.toLowerCase().includes(query)
  )
}

export async function getFeaturedBooks(limit = 6): Promise<Book[]> {
  const db = await getDb()
  if (!db) return []

  return cacheWrapper(`${CACHE_PREFIX}:featured:${limit}`, async () => {
    const rows = await db.select()
      .from(books)
      .where(and(eq(books.featured, true), eq(books.deleted, false), eq(books.archived, false)))
      .orderBy(desc(books.reviewsCount))
      .limit(limit)
    return rows
  }, 60_000)
}

export async function getBestsellers(limit = 4): Promise<Book[]> {
  const db = await getDb()
  if (!db) return []

  return cacheWrapper(`${CACHE_PREFIX}:bestsellers:${limit}`, async () => {
    const rows = await db.select()
      .from(books)
      .where(and(eq(books.bestseller, true), eq(books.deleted, false), eq(books.archived, false)))
      .orderBy(desc(books.rating))
      .limit(limit)
    return rows
  }, 60_000)
}

export async function getAllBooks(opts?: {
  q?: string
  category?: string
  sort?: 'popular' | 'newest' | 'price-asc' | 'price-desc'
}): Promise<Book[]> {
  const db = await getDb()
  if (!db) return []

  const conditions = [eq(books.deleted, false), eq(books.archived, false)]

  if (opts?.category && opts.category !== 'All') {
    conditions.push(eq(books.category, opts.category as Book['category']))
  }

  if (opts?.q) {
    const rows = await db.select()
      .from(books)
      .where(and(...conditions))
    return filterAndSort(rows, opts)
  }

  let orderBy = desc(books.reviewsCount)
  switch (opts?.sort) {
    case 'newest':
      orderBy = desc(books.createdAt)
      break
    case 'price-asc':
      orderBy = asc(books.price)
      break
    case 'price-desc':
      orderBy = desc(books.price)
      break
  }

  const rows = await db.select()
    .from(books)
    .where(and(...conditions))
    .orderBy(orderBy)

  return rows
}

function filterAndSort(rows: Book[], opts?: { q?: string; sort?: 'popular' | 'newest' | 'price-asc' | 'price-desc' }): Book[] {
  let results = [...rows]

  if (opts?.q) {
    results = results.filter((b) => matchesQuery(b, opts.q!))
  }

  switch (opts?.sort) {
    case 'newest':
      results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      break
    case 'price-asc':
      results.sort((a, b) => Number(a.price) - Number(b.price))
      break
    case 'price-desc':
      results.sort((a, b) => Number(b.price) - Number(a.price))
      break
    default:
      results.sort((a, b) => b.reviewsCount - a.reviewsCount)
  }

  return results
}

export async function getBookBySlug(slug: string): Promise<Book | undefined> {
  const db = await getDb()
  if (!db) return undefined

  const rows = await db.select()
    .from(books)
    .where(and(eq(books.slug, slug), eq(books.deleted, false), eq(books.archived, false)))
    .limit(1)

  if (rows.length === 0) return undefined
  return rows[0]
}

export async function getRelatedBooks(
  category: string,
  excludeSlug: string,
  limit = 3,
): Promise<Book[]> {
  const db = await getDb()
  if (!db) return []

  const rows = await db.select()
    .from(books)
    .where(and(
      eq(books.category, category as Book['category']),
      ne(books.slug, excludeSlug),
      eq(books.deleted, false),
      eq(books.archived, false),
    ))
    .limit(limit)

  return rows
}

export async function getCategoryCounts(): Promise<Record<string, number>> {
  const db = await getDb()
  if (!db) return {}

  const rows = await db.select({
    category: books.category,
    count: sql<number>`count(*)`,
  })
    .from(books)
    .where(and(eq(books.deleted, false), eq(books.archived, false)))
    .groupBy(books.category)

  const counts: Record<string, number> = {}
  for (const r of rows) {
    counts[r.category] = r.count
  }
  return counts
}

import 'server-only'
import { randomUUID } from 'crypto'
import { eq, and, desc, ne } from 'drizzle-orm'
import { sql } from 'drizzle-orm'
import { getDb } from '@/lib/db/connection'
import { books, pendingChanges, type Book, type NewBook } from '@/lib/db/schema'
import { invalidateCache, cacheWrapper } from '@/lib/db/cache'

export type { Book, NewBook }

export interface PendingChange {
  id: string
  bookSlug: string
  bookTitle: string
  type: 'create' | 'update' | 'delete' | 'archive'
  changes: Partial<Book>
  submittedBy: string
  submittedByEmail: string
  submittedAt: string
  status: 'pending' | 'approved' | 'rejected'
  reviewedBy?: string
  reviewedAt?: string
}

const CACHE_PREFIX = 'admin_books'

// Public book queries in lib/books.ts are cached under the 'books' prefix.
// Invalidate both so storefront listings reflect admin edits immediately.
function invalidateBookCaches() {
  invalidateCache(CACHE_PREFIX)
  invalidateCache('books')
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function sanitizeSlug(slug: string): string {
  return slug
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120)
}

/* ------------------------------------------------------------------ */
/* Books CRUD                                                          */
/* ------------------------------------------------------------------ */

export async function listAdminBooks(): Promise<Book[]> {
  const db = await getDb()
  if (!db) return []

  return cacheWrapper(`${CACHE_PREFIX}:list`, async () => {
    const rows = await db.select()
      .from(books)
      .where(eq(books.source, 'admin'))
      .orderBy(desc(books.updatedAt))
    return rows
  }, 30_000)
}

export async function getAdminBook(id: number): Promise<Book | undefined> {
  const db = await getDb()
  if (!db) return undefined

  const rows = await db.select()
    .from(books)
    .where(and(eq(books.id, id), eq(books.source, 'admin')))
    .limit(1)
  return rows[0]
}

export async function findAdminBookBySlug(slug: string): Promise<Book | undefined> {
  const db = await getDb()
  if (!db) return undefined

  const rows = await db.select()
    .from(books)
    .where(and(eq(books.slug, slug), eq(books.source, 'admin')))
    .limit(1)
  return rows[0]
}

export async function createAdminBook(
  book: Omit<NewBook, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<Book> {
  const db = await getDb()
  if (!db) throw new Error('Database not available')

  const slug = sanitizeSlug(book.slug || generateSlug(book.title))

  const existing = await db.select({ id: books.id })
    .from(books)
    .where(eq(books.slug, slug))
    .limit(1)

  if (existing.length > 0) {
    throw new Error('A book with this slug already exists')
  }

  const now = new Date()
  const [inserted] = await db.insert(books).values({
    slug,
    title: book.title,
    author: book.author,
    category: book.category as Book['category'],
    price: book.price ?? '0',
    currency: (book.currency ?? 'NGN') as Book['currency'],
    coverImage: book.coverImage,
    fileUrl: book.fileUrl,
    tagline: book.tagline ?? '',
    description: book.description ?? '',
    rating: book.rating ?? '5.0',
    reviewsCount: book.reviewsCount ?? 0,
    pages: book.pages ?? 0,
    featured: book.featured ?? false,
    bestseller: book.bestseller ?? false,
    source: 'admin',
    archived: false,
    deleted: false,
    createdAt: now,
    updatedAt: now,
  }).returning()

  invalidateBookCaches()
  return inserted
}

export async function updateAdminBook(
  id: number,
  updates: Partial<Omit<NewBook, 'id' | 'createdAt' | 'updatedAt'>>,
): Promise<Book> {
  const db = await getDb()
  if (!db) throw new Error('Database not available')

  const existing = await db.select().from(books)
    .where(and(eq(books.id, id), eq(books.source, 'admin')))
    .limit(1)
  if (existing.length === 0) throw new Error('Book not found')
  if (existing[0].deleted) throw new Error('Cannot update a deleted book')

  if (updates.slug) updates.slug = sanitizeSlug(updates.slug)

  if (updates.slug && updates.slug !== existing[0].slug) {
    const slugExists = await db.select({ id: books.id })
      .from(books)
      .where(and(eq(books.slug, updates.slug), ne(books.id, id)))
      .limit(1)
    if (slugExists.length > 0) {
      throw new Error('A book with this slug already exists')
    }
  }

  const [updated] = await db.update(books)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(books.id, id))
    .returning()

  invalidateBookCaches()
  return updated
}

export async function deleteAdminBook(id: number): Promise<void> {
  const db = await getDb()
  if (!db) throw new Error('Database not available')

  const existing = await db.select().from(books)
    .where(and(eq(books.id, id), eq(books.source, 'admin')))
    .limit(1)
  if (existing.length === 0) throw new Error('Book not found')

  // "Delete" is a storefront soft-delete. Hard deletion would cascade through
  // user_purchases and erase paid entitlements. Keep the row and private file so
  // existing purchasers can continue to read while the title disappears from
  // catalogue/cart discovery.
  await db.update(books)
    .set({ deleted: true, archived: true, updatedAt: new Date() })
    .where(and(eq(books.id, id), eq(books.source, 'admin')))

  invalidateBookCaches()
}

export async function deleteBookBySlug(slug: string): Promise<void> {
  const db = await getDb()
  if (!db) throw new Error('Database not available')

  const existing = await db.select().from(books).where(eq(books.slug, slug)).limit(1)

  if (existing.length > 0) {
    await db.update(books)
      .set({ deleted: true, archived: true, updatedAt: new Date() })
      .where(eq(books.slug, slug))
  } else {
    throw new Error('Book not found')
  }

  invalidateBookCaches()
}

/* ------------------------------------------------------------------ */
/* Archive                                                             */
/* ------------------------------------------------------------------ */

export async function archiveBook(slug: string, archived: boolean): Promise<void> {
  const db = await getDb()
  if (!db) throw new Error('Database not available')

  const existing = await db.select({ id: books.id }).from(books).where(eq(books.slug, slug)).limit(1)
  if (existing.length === 0) throw new Error('Book not found')

  await db.update(books)
    .set({ archived, updatedAt: new Date() })
    .where(eq(books.slug, slug))

  invalidateBookCaches()
}

/* ------------------------------------------------------------------ */
/* Pending Changes (sub-admin approval workflow)                       */
/* ------------------------------------------------------------------ */

export async function submitPendingChange(
  type: PendingChange['type'],
  bookSlug: string,
  bookTitle: string,
  changes: Partial<Book>,
  submittedBy: string,
  submittedByEmail: string,
): Promise<PendingChange> {
  const db = await getDb()
  if (!db) throw new Error('Database not available')

  const now = new Date()
  const [inserted] = await db.insert(pendingChanges).values({
    id: randomUUID(),
    bookSlug,
    bookTitle,
    type: type as typeof pendingChanges.$inferInsert['type'],
    changes: JSON.stringify(changes),
    submittedBy,
    submittedByEmail,
    submittedAt: now,
    status: 'pending',
  }).returning()

  return {
    id: inserted.id,
    bookSlug: inserted.bookSlug,
    bookTitle: inserted.bookTitle,
    type: inserted.type as PendingChange['type'],
    changes: JSON.parse(inserted.changes),
    submittedBy: inserted.submittedBy,
    submittedByEmail: inserted.submittedByEmail,
    submittedAt: inserted.submittedAt.toISOString(),
    status: inserted.status as PendingChange['status'],
  }
}

export async function approveChange(changeId: string, reviewedBy: string): Promise<PendingChange> {
  const db = await getDb()
  if (!db) throw new Error('Database not available')

  const result = await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${`pending-change:${changeId}`}, 0))`)

    const rows = await tx.select().from(pendingChanges)
      .where(eq(pendingChanges.id, changeId))
      .limit(1)
    const change = rows[0]
    if (!change) throw new Error('Pending change not found')
    if (change.status !== 'pending') throw new Error('Change already processed')

    let parsedChanges: Partial<Book>
    try {
      parsedChanges = JSON.parse(change.changes) as Partial<Book>
    } catch {
      throw new Error('Pending change data is invalid')
    }

    const now = new Date()

    if (change.type === 'delete') {
      const existing = await tx.select({ id: books.id }).from(books)
        .where(eq(books.slug, change.bookSlug))
        .limit(1)
      if (!existing[0]) throw new Error('Book not found')
      await tx.update(books)
        .set({ deleted: true, archived: true, updatedAt: now })
        .where(eq(books.slug, change.bookSlug))
    } else if (change.type === 'archive') {
      const existing = await tx.select({ id: books.id }).from(books)
        .where(eq(books.slug, change.bookSlug))
        .limit(1)
      if (!existing[0]) throw new Error('Book not found')
      await tx.update(books)
        .set({ archived: parsedChanges.archived ?? true, updatedAt: now })
        .where(eq(books.slug, change.bookSlug))
    } else if (change.type === 'create') {
      const slug = sanitizeSlug(parsedChanges.slug || generateSlug(parsedChanges.title || ''))
      if (!slug) throw new Error('Could not generate a valid slug')

      const slugExists = await tx.select({ id: books.id })
        .from(books)
        .where(eq(books.slug, slug))
        .limit(1)
      if (slugExists[0]) throw new Error('A book with this slug already exists')

      await tx.insert(books).values({
        slug,
        title: parsedChanges.title ?? 'Untitled',
        author: parsedChanges.author ?? 'Unknown',
        category: (parsedChanges.category ?? 'Mindset & Confidence') as Book['category'],
        price: parsedChanges.price ?? '0',
        currency: (parsedChanges.currency ?? 'NGN') as Book['currency'],
        coverImage: parsedChanges.coverImage ?? '',
        fileUrl: parsedChanges.fileUrl ?? null,
        tagline: parsedChanges.tagline ?? '',
        description: parsedChanges.description ?? '',
        rating: parsedChanges.rating ?? '5.0',
        reviewsCount: parsedChanges.reviewsCount ?? 0,
        pages: parsedChanges.pages ?? 0,
        featured: parsedChanges.featured ?? false,
        bestseller: parsedChanges.bestseller ?? false,
        source: 'admin',
        archived: false,
        deleted: false,
        createdAt: now,
        updatedAt: now,
      })
    } else if (change.type === 'update') {
      const existing = await tx.select().from(books)
        .where(eq(books.slug, change.bookSlug))
        .limit(1)
      const currentBook = existing[0]
      if (!currentBook) throw new Error('Book not found')
      if (currentBook.deleted) throw new Error('Cannot update a deleted book')

      const safeChanges = { ...parsedChanges }
      if (safeChanges.slug) {
        safeChanges.slug = sanitizeSlug(safeChanges.slug)
        if (!safeChanges.slug) throw new Error('Could not generate a valid slug')
        if (safeChanges.slug !== currentBook.slug) {
          const slugExists = await tx.select({ id: books.id }).from(books)
            .where(and(eq(books.slug, safeChanges.slug), ne(books.id, currentBook.id)))
            .limit(1)
          if (slugExists[0]) throw new Error('A book with this slug already exists')
        }
      }

      await tx.update(books)
        .set({ ...safeChanges, updatedAt: now })
        .where(eq(books.id, currentBook.id))
      parsedChanges = safeChanges
    } else {
      throw new Error('Unsupported pending change type')
    }

    const [updated] = await tx.update(pendingChanges)
      .set({ status: 'approved', reviewedBy, reviewedAt: now })
      .where(and(eq(pendingChanges.id, changeId), eq(pendingChanges.status, 'pending')))
      .returning()

    if (!updated) throw new Error('Change already processed')

    return {
      id: updated.id,
      bookSlug: updated.bookSlug,
      bookTitle: updated.bookTitle,
      type: updated.type as PendingChange['type'],
      changes: parsedChanges,
      submittedBy: updated.submittedBy,
      submittedByEmail: updated.submittedByEmail,
      submittedAt: updated.submittedAt.toISOString(),
      status: updated.status as PendingChange['status'],
      reviewedBy: updated.reviewedBy ?? undefined,
      reviewedAt: updated.reviewedAt?.toISOString(),
    }
  })

  invalidateBookCaches()
  return result
}

export async function rejectChange(changeId: string, reviewedBy: string): Promise<PendingChange> {
  const db = await getDb()
  if (!db) throw new Error('Database not available')

  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${`pending-change:${changeId}`}, 0))`)

    const rows = await tx.select().from(pendingChanges)
      .where(eq(pendingChanges.id, changeId))
      .limit(1)
    const existing = rows[0]
    if (!existing) throw new Error('Pending change not found')
    if (existing.status !== 'pending') throw new Error('Change already processed')

    const now = new Date()
    const [updated] = await tx.update(pendingChanges)
      .set({ status: 'rejected', reviewedBy, reviewedAt: now })
      .where(and(eq(pendingChanges.id, changeId), eq(pendingChanges.status, 'pending')))
      .returning()

    if (!updated) throw new Error('Change already processed')

    let changes: Partial<Book> = {}
    try {
      changes = JSON.parse(updated.changes)
    } catch {
      changes = {}
    }

    return {
      id: updated.id,
      bookSlug: updated.bookSlug,
      bookTitle: updated.bookTitle,
      type: updated.type as PendingChange['type'],
      changes,
      submittedBy: updated.submittedBy,
      submittedByEmail: updated.submittedByEmail,
      submittedAt: updated.submittedAt.toISOString(),
      status: updated.status as PendingChange['status'],
      reviewedBy: updated.reviewedBy ?? undefined,
      reviewedAt: updated.reviewedAt?.toISOString(),
    }
  })
}

export async function listPendingChanges(): Promise<PendingChange[]> {
  const db = await getDb()
  if (!db) return []

  const rows = await db.select()
    .from(pendingChanges)
    .where(eq(pendingChanges.status, 'pending'))
    .orderBy(desc(pendingChanges.submittedAt))

  return rows.map((c: { id: string; bookSlug: string; bookTitle: string; type: string; changes: string; submittedBy: string; submittedByEmail: string; submittedAt: Date; status: string; reviewedBy: string | null; reviewedAt: Date | null }) => ({
    id: c.id,
    bookSlug: c.bookSlug,
    bookTitle: c.bookTitle,
    type: c.type as PendingChange['type'],
    changes: JSON.parse(c.changes),
    submittedBy: c.submittedBy,
    submittedByEmail: c.submittedByEmail,
    submittedAt: c.submittedAt.toISOString(),
    status: c.status as PendingChange['status'],
  }))
}

export async function countPendingChanges(): Promise<number> {
  const db = await getDb()
  if (!db) return 0

  const [result] = await db.select({ count: sql<number>`count(*)::int` })
    .from(pendingChanges)
    .where(eq(pendingChanges.status, 'pending'))

  return result?.count ?? 0
}

/* ------------------------------------------------------------------ */
/* Merged View                                                         */
/* ------------------------------------------------------------------ */

export type MergedBook = Book & { source: 'seed' | 'admin' }

export async function getAllMergedBooks(opts?: { includeArchived?: boolean }): Promise<MergedBook[]> {
  const db = await getDb()
  if (!db) return []

  const cacheKey = `${CACHE_PREFIX}:merged:${opts?.includeArchived ?? false}`

  return cacheWrapper(cacheKey, async () => {
    const conditions = [eq(books.deleted, false)]
    if (!opts?.includeArchived) {
      conditions.push(eq(books.archived, false))
    }

    const rows = await db.select()
      .from(books)
      .where(and(...conditions))
      .orderBy(desc(books.createdAt))

    return rows as MergedBook[]
  }, 30_000)
}

export const ADMIN_CATEGORIES = [
  'Mindset & Confidence',
  'Career & Wealth',
  'Wellness & Self-Care',
  'Relationships',
  'Spirituality & Purpose',
  'Leadership',
] as const

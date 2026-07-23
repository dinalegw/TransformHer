import 'server-only'
import { eq, and, lte } from 'drizzle-orm'
import { getDb } from '@/lib/db/connection'
import { userPurchases, cart as cartTable, books } from '@/lib/db/schema'

export interface LibraryItem {
  id: number
  userId: string
  bookId: number
  bookSlug: string
  purchaseDate: string
  released: boolean
  releaseAt: string | null
  archived?: boolean
}

export interface CartItem {
  id: number
  userId: string
  bookId: number
  addedAt: string
}

function toLibraryItem(r: typeof userPurchases.$inferSelect): LibraryItem {
  return {
    id: r.id,
    userId: r.userId,
    bookId: r.bookId,
    bookSlug: r.bookSlug,
    purchaseDate: r.purchaseDate.toISOString(),
    released: r.released,
    releaseAt: r.releaseAt ? r.releaseAt.toISOString() : null,
    archived: r.archived ?? false,
  }
}

function toCartItem(r: typeof cartTable.$inferSelect): CartItem {
  return {
    id: r.id,
    userId: r.userId,
    bookId: r.bookId,
    addedAt: r.addedAt.toISOString(),
  }
}

export async function fetchLibrary(userId: string, includeArchived = false, isMasterAdmin = false): Promise<LibraryItem[]> {
  if (isMasterAdmin) return []

  const db = await getDb()
  if (!db) return []

  const conditions = [eq(userPurchases.userId, userId)]
  if (!includeArchived) {
    conditions.push(eq(userPurchases.archived, false))
  }

  const rows = await db.select()
    .from(userPurchases)
    .where(and(...conditions))

  return rows.map(toLibraryItem)
}

export async function getLibraryItem(userId: string, bookId: number, isMasterAdmin = false): Promise<LibraryItem | null> {
  if (isMasterAdmin) {
    return {
      id: 0, userId, bookId, bookSlug: '',
      purchaseDate: new Date().toISOString(), released: true, releaseAt: null,
    }
  }

  const db = await getDb()
  if (!db) return null

  const rows = await db.select()
    .from(userPurchases)
    .where(and(eq(userPurchases.userId, userId), eq(userPurchases.bookId, bookId)))
    .limit(1)

  return rows.length > 0 ? toLibraryItem(rows[0]) : null
}

export async function addToLibrary(userId: string, bookId: number, bookSlug: string): Promise<void> {
  const db = await getDb()
  if (!db) throw new Error('Database not available')

  const existing = await db.select({ id: userPurchases.id })
    .from(userPurchases)
    .where(and(eq(userPurchases.userId, userId), eq(userPurchases.bookId, bookId)))
    .limit(1)

  if (existing.length > 0) throw new Error('Book already in library')

  const now = new Date()
  await db.insert(userPurchases).values({
    userId, bookId, bookSlug, released: true, releaseAt: now,
  })
}

export async function recordPurchase(
  userId: string,
  bookId: number,
  bookSlug: string,
  paymentReference?: string,
): Promise<void> {
  const db = await getDb()
  if (!db) throw new Error('Database not available')

  const existing = await db.select({ id: userPurchases.id })
    .from(userPurchases)
    .where(and(eq(userPurchases.userId, userId), eq(userPurchases.bookId, bookId)))
    .limit(1)

  if (existing.length > 0) return

  const releaseAt = new Date(Date.now() + 72 * 60 * 60 * 1000)
  await db.insert(userPurchases).values({
    userId, bookId, bookSlug, paymentReference,
    released: false,
    releaseAt,
  })
}

export async function releaseLibraryItem(userId: string, bookSlug: string): Promise<boolean> {
  const db = await getDb()
  if (!db) return false

  const result = await db.update(userPurchases)
    .set({ released: true, releaseAt: new Date() })
    .where(and(eq(userPurchases.userId, userId), eq(userPurchases.bookSlug, bookSlug)))

  return (result.rowCount ?? 0) > 0
}

export async function releasePendingBooks(userId: string): Promise<LibraryItem[]> {
  const db = await getDb()
  if (!db) return []

  const now = new Date()
  const pending = await db.select()
    .from(userPurchases)
    .where(and(
      eq(userPurchases.userId, userId),
      eq(userPurchases.released, false),
      lte(userPurchases.releaseAt, now),
    ))

  const released: LibraryItem[] = []
  for (const item of pending) {
    await db.update(userPurchases)
      .set({ released: true })
      .where(eq(userPurchases.id, item.id))
    released.push(toLibraryItem(item))
  }

  return released
}

export async function removeFromLibrary(userId: string, bookId: number): Promise<void> {
  const db = await getDb()
  if (!db) throw new Error('Database not available')

  await db.delete(userPurchases)
    .where(and(eq(userPurchases.userId, userId), eq(userPurchases.bookId, bookId)))
}

export async function archiveLibraryItem(userId: string, bookSlug: string, archived: boolean): Promise<void> {
  const db = await getDb()
  if (!db) throw new Error('Database not available')

  const result = await db.update(userPurchases)
    .set({ archived })
    .where(and(eq(userPurchases.userId, userId), eq(userPurchases.bookSlug, bookSlug)))

  if ((result.rowCount ?? 0) === 0) throw new Error('Library item not found')
}

export async function ownsBookBySlug(userId: string, slug: string, isMasterAdmin = false): Promise<boolean> {
  if (isMasterAdmin) return true

  const db = await getDb()
  if (!db) return false

  const rows = await db.select({ id: userPurchases.id })
    .from(userPurchases)
    .where(and(eq(userPurchases.userId, userId), eq(userPurchases.bookSlug, slug)))
    .limit(1)

  return rows.length > 0
}

/* ─── Cart ────────────────────────────────────────────────────────── */

export async function fetchCart(userId: string): Promise<CartItem[]> {
  const db = await getDb()
  if (!db) return []

  const rows = await db.select()
    .from(cartTable)
    .where(eq(cartTable.userId, userId))
    .orderBy(cartTable.addedAt)

  return rows.map(toCartItem)
}

export async function getCartItem(userId: string, bookId: number): Promise<CartItem | null> {
  const db = await getDb()
  if (!db) return null

  const rows = await db.select()
    .from(cartTable)
    .where(and(eq(cartTable.userId, userId), eq(cartTable.bookId, bookId)))
    .limit(1)

  return rows.length > 0 ? toCartItem(rows[0]) : null
}

export async function addToCart(userId: string, bookId: number): Promise<void> {
  const owned = await getLibraryItem(userId, bookId)
  if (owned) throw new Error('You already own this book')

  const db = await getDb()
  if (!db) throw new Error('Database not available')

  const book = await db.select({ id: books.id, deleted: books.deleted, archived: books.archived })
    .from(books)
    .where(eq(books.id, bookId))
    .limit(1)
  if (book.length === 0) throw new Error('Book not found')
  if (book[0].deleted || book[0].archived) throw new Error('This book is no longer available')

  const existing = await db.select({ id: cartTable.id })
    .from(cartTable)
    .where(and(eq(cartTable.userId, userId), eq(cartTable.bookId, bookId)))
    .limit(1)

  if (existing.length > 0) return

  await db.insert(cartTable).values({ userId, bookId })
}

export async function removeFromCart(userId: string, bookId: number): Promise<void> {
  const db = await getDb()
  if (!db) throw new Error('Database not available')

  await db.delete(cartTable)
    .where(and(eq(cartTable.userId, userId), eq(cartTable.bookId, bookId)))
}

import 'server-only'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import { randomUUID } from 'crypto'
import { SEED_BOOKS, type SeedBook } from '@/lib/seed'
import { deleteBookFile } from '@/lib/storage'

export interface AdminBook {
  id: string
  slug: string
  title: string
  author: string
  category: string
  price: string
  currency: string
  coverImage: string
  fileUrl?: string
  tagline: string
  description: string
  rating: string
  reviewsCount: number
  pages: number
  featured: boolean
  bestseller: boolean
  archived: boolean
  createdAt: string
  updatedAt: string
  deleted?: boolean
}

export interface PendingChange {
  id: string
  bookSlug: string
  bookTitle: string
  type: 'create' | 'update' | 'delete' | 'archive'
  changes: Partial<AdminBook>
  submittedBy: string
  submittedByEmail: string
  submittedAt: string
  status: 'pending' | 'approved' | 'rejected'
  reviewedBy?: string
  reviewedAt?: string
}

interface AdminBooksStore {
  books: AdminBook[]
  pendingChanges: PendingChange[]
}

function getDataDir(): string {
  return join(process.cwd(), 'data')
}

function getBooksFile(): string {
  return join(getDataDir(), 'books.json')
}

function loadStore(): AdminBooksStore {
  try {
    const file = getBooksFile()
    if (existsSync(file)) {
      const raw = readFileSync(file, 'utf-8')
      const data = JSON.parse(raw)
      return {
        books: Array.isArray(data.books) ? data.books : [],
        pendingChanges: Array.isArray(data.pendingChanges) ? data.pendingChanges : [],
      }
    }
  } catch {
    // corrupt file, start fresh
  }
  return { books: [], pendingChanges: [] }
}

function saveStore(store: AdminBooksStore): void {
  try {
    const dir = getDataDir()
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }
    writeFileSync(getBooksFile(), JSON.stringify(store, null, 2), 'utf-8')
  } catch {
    // silently fail – data is still in memory
  }
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function normalizeAdminBook(book: Omit<AdminBook, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): AdminBook {
  return {
    id: book.id || randomUUID(),
    slug: book.slug || generateSlug(book.title),
    title: book.title,
    author: book.author,
    category: book.category,
    price: book.price,
    currency: book.currency || 'NGN',
    coverImage: book.coverImage,
    fileUrl: book.fileUrl,
    tagline: book.tagline || '',
    description: book.description || '',
    rating: book.rating || '5.0',
    reviewsCount: book.reviewsCount || 0,
    pages: book.pages || 0,
    featured: book.featured ?? false,
    bestseller: book.bestseller ?? false,
    archived: book.archived ?? false,
    createdAt: (book as Record<string, unknown>).createdAt as string || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deleted: book.deleted ?? false,
  }
}

/* ------------------------------------------------------------------ */
/* Books CRUD                                                          */
/* ------------------------------------------------------------------ */

export async function listAdminBooks(): Promise<AdminBook[]> {
  const store = loadStore()
  return store.books.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
}

export async function getAdminBook(id: string): Promise<AdminBook | undefined> {
  const store = loadStore()
  return store.books.find((b) => b.id === id)
}

export async function findAdminBookBySlug(slug: string): Promise<AdminBook | undefined> {
  const store = loadStore()
  return store.books.find((b) => b.slug === slug)
}

export async function createAdminBook(
  book: Omit<AdminBook, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<AdminBook> {
  const slug = book.slug || generateSlug(book.title)
  const store = loadStore()

  if (store.books.some((b) => b.slug === slug && !b.deleted)) {
    throw new Error('A book with this slug already exists')
  }

  const normalized = normalizeAdminBook({ ...book, slug })
  store.books.push(normalized)
  saveStore(store)
  return normalized
}

export async function updateAdminBook(
  id: string,
  updates: Partial<Omit<AdminBook, 'id' | 'createdAt' | 'updatedAt'>>,
): Promise<AdminBook> {
  const store = loadStore()
  const index = store.books.findIndex((b) => b.id === id)
  if (index === -1) throw new Error('Book not found')

  const existing = store.books[index]
  if (existing.deleted) throw new Error('Cannot update a deleted book')

  const updated: AdminBook = {
    ...existing,
    ...updates,
    id: existing.id,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
  }

  if (updates.slug && updates.slug !== existing.slug) {
    if (store.books.some((b) => b.slug === updates.slug && b.id !== id)) {
      throw new Error('A book with this slug already exists')
    }
  }

  store.books[index] = updated
  saveStore(store)
  return updated
}

export async function deleteAdminBook(id: string): Promise<void> {
  const store = loadStore()
  const index = store.books.findIndex((b) => b.id === id)
  if (index === -1) throw new Error('Book not found')

  const book = store.books[index]
  if (book.fileUrl) {
    deleteBookFile(book.fileUrl)
  }

  store.books.splice(index, 1)
  saveStore(store)
}

export async function deleteBookBySlug(slug: string): Promise<void> {
  const store = loadStore()
  const existingIndex = store.books.findIndex((b) => b.slug === slug)

  if (existingIndex >= 0) {
    // Soft-delete: mark as deleted but keep record (existing owners keep access)
    store.books[existingIndex].deleted = true
    store.books[existingIndex].archived = true
    store.books[existingIndex].updatedAt = new Date().toISOString()
  } else {
    const seed = SEED_BOOKS.find((b) => b.slug === slug)
    if (!seed) throw new Error('Book not found')

    store.books.push(normalizeAdminBook({
      slug,
      title: seed.title,
      author: seed.author,
      category: seed.category,
      price: seed.price,
      currency: seed.currency,
      coverImage: seed.coverImage,
      tagline: seed.tagline,
      description: seed.description,
      rating: seed.rating,
      reviewsCount: seed.reviewsCount,
      pages: seed.pages,
      featured: seed.featured,
      bestseller: seed.bestseller,
      deleted: true,
      archived: true,
    }))
  }

  saveStore(store)
}

/* ------------------------------------------------------------------ */
/* Archive                                                             */
/* ------------------------------------------------------------------ */

export async function archiveBook(slug: string, archived: boolean): Promise<void> {
  const store = loadStore()
  const existingIndex = store.books.findIndex((b) => b.slug === slug)

  if (existingIndex >= 0) {
    store.books[existingIndex].archived = archived
    store.books[existingIndex].updatedAt = new Date().toISOString()
  } else {
    const seed = SEED_BOOKS.find((b) => b.slug === slug)
    if (!seed) throw new Error('Book not found')

    store.books.push(normalizeAdminBook({
      slug,
      title: seed.title,
      author: seed.author,
      category: seed.category,
      price: seed.price,
      currency: seed.currency,
      coverImage: seed.coverImage,
      tagline: seed.tagline,
      description: seed.description,
      rating: seed.rating,
      reviewsCount: seed.reviewsCount,
      pages: seed.pages,
      featured: seed.featured,
      bestseller: seed.bestseller,
      archived,
    }))
  }

  saveStore(store)
}

/* ------------------------------------------------------------------ */
/* Pending Changes (sub-admin approval workflow)                       */
/* ------------------------------------------------------------------ */

export async function submitPendingChange(
  type: PendingChange['type'],
  bookSlug: string,
  bookTitle: string,
  changes: Partial<AdminBook>,
  submittedBy: string,
  submittedByEmail: string,
): Promise<PendingChange> {
  const store = loadStore()
  const change: PendingChange = {
    id: randomUUID(),
    bookSlug,
    bookTitle,
    type,
    changes,
    submittedBy,
    submittedByEmail,
    submittedAt: new Date().toISOString(),
    status: 'pending',
  }
  store.pendingChanges.push(change)
  saveStore(store)
  return change
}

export async function approveChange(changeId: string, reviewedBy: string): Promise<PendingChange> {
  const store = loadStore()
  const index = store.pendingChanges.findIndex((c) => c.id === changeId)
  if (index === -1) throw new Error('Pending change not found')

  const change = store.pendingChanges[index]
  if (change.status !== 'pending') throw new Error('Change already processed')

  change.status = 'approved'
  change.reviewedBy = reviewedBy
  change.reviewedAt = new Date().toISOString()

  // Apply the changes to the actual book
  if (change.type === 'delete') {
    await deleteBookBySlug(change.bookSlug)
  } else if (change.type === 'archive') {
    await archiveBook(change.bookSlug, change.changes.archived ?? true)
  } else {
    // create or update: find or create the admin book entry
    const existing = store.books.find((b) => b.slug === change.bookSlug)
    if (existing) {
      Object.assign(existing, change.changes, {
        id: existing.id,
        createdAt: existing.createdAt,
        updatedAt: new Date().toISOString(),
      })
    } else if (change.type === 'create') {
      store.books.push(normalizeAdminBook(change.changes as Omit<AdminBook, 'id' | 'createdAt' | 'updatedAt'>))
    }
  }

  store.pendingChanges[index] = change
  saveStore(store)
  return change
}

export async function rejectChange(changeId: string, reviewedBy: string): Promise<PendingChange> {
  const store = loadStore()
  const index = store.pendingChanges.findIndex((c) => c.id === changeId)
  if (index === -1) throw new Error('Pending change not found')

  const change = store.pendingChanges[index]
  if (change.status !== 'pending') throw new Error('Change already processed')

  change.status = 'rejected'
  change.reviewedBy = reviewedBy
  change.reviewedAt = new Date().toISOString()

  store.pendingChanges[index] = change
  saveStore(store)
  return change
}

export async function listPendingChanges(): Promise<PendingChange[]> {
  const store = loadStore()
  return store.pendingChanges
    .filter((c) => c.status === 'pending')
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
}

export async function countPendingChanges(): Promise<number> {
  const store = loadStore()
  return store.pendingChanges.filter((c) => c.status === 'pending').length
}

/* ------------------------------------------------------------------ */
/* Merged View                                                         */
/* ------------------------------------------------------------------ */

export type MergedBook = (SeedBook | AdminBook) & { source: 'seed' | 'admin'; archived?: boolean; createdAt: Date | string; fileUrl?: string }

export async function getAllMergedBooks(opts?: { includeArchived?: boolean }): Promise<MergedBook[]> {
  const adminBooks = await listAdminBooks()
  const deletedSlugs = new Set(adminBooks.filter((b) => b.deleted).map((b) => b.slug))
  const archivedSlugs = new Set(adminBooks.filter((b) => !b.deleted && b.archived).map((b) => b.slug))
  const activeAdminSlugs = new Set(adminBooks.filter((b) => !b.deleted && !b.archived).map((b) => b.slug))

  const seedWithSource: MergedBook[] = SEED_BOOKS
    .filter((b) => !deletedSlugs.has(b.slug) && !archivedSlugs.has(b.slug) && !activeAdminSlugs.has(b.slug))
    .map((b) => ({ ...b, source: 'seed' as const }))

  const adminWithSource: MergedBook[] = adminBooks
    .filter((b) => !b.deleted && (opts?.includeArchived || !b.archived))
    .map((b) => ({
      ...b,
      source: 'admin' as const,
    }))

  return [...seedWithSource, ...adminWithSource].sort((a, b) => {
    const aDate = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt).getTime()
    const bDate = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt).getTime()
    return bDate - aDate
  })
}

export const ADMIN_CATEGORIES = [
  'Mindset & Confidence',
  'Career & Wealth',
  'Wellness & Self-Care',
  'Relationships',
  'Spirituality & Purpose',
  'Leadership',
] as const

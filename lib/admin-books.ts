import 'server-only'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import { randomUUID } from 'crypto'
import { SEED_BOOKS, type SeedBook } from '@/lib/seed'

export interface AdminBook {
  id: string
  slug: string
  title: string
  author: string
  category: string
  price: string
  currency: string
  coverImage: string
  tagline: string
  description: string
  rating: string
  reviewsCount: number
  pages: number
  featured: boolean
  bestseller: boolean
  createdAt: string
  updatedAt: string
}

interface AdminBooksStore {
  books: AdminBook[]
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
      if (Array.isArray(data.books)) {
        return { books: data.books }
      }
    }
  } catch {
    // corrupt file, start fresh
  }
  return { books: [] }
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
    tagline: book.tagline || '',
    description: book.description || '',
    rating: book.rating || '5.0',
    reviewsCount: book.reviewsCount || 0,
    pages: book.pages || 0,
    featured: book.featured ?? false,
    bestseller: book.bestseller ?? false,
    createdAt: book.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

export async function listAdminBooks(): Promise<AdminBook[]> {
  const store = loadStore()
  return store.books.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
}

export async function getAdminBook(id: string): Promise<AdminBook | undefined> {
  const store = loadStore()
  return store.books.find((b) => b.id === id)
}

function isSeedBookSlug(slug: string): boolean {
  return SEED_BOOKS.some((b) => b.slug === slug)
}

export async function createAdminBook(
  book: Omit<AdminBook, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<AdminBook> {
  const slug = book.slug || generateSlug(book.title)

  const store = loadStore()
  if (store.books.some((b) => b.slug === slug)) {
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
  if (index === -1) {
    throw new Error('Book not found')
  }

  const existing = store.books[index]
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
  if (index === -1) {
    throw new Error('Book not found')
  }
  store.books.splice(index, 1)
  saveStore(store)
}

export type MergedBook = (SeedBook | AdminBook) & { source: 'seed' | 'admin' }

export async function getAllMergedBooks(): Promise<MergedBook[]> {
  const adminBooks = await listAdminBooks()
  const adminSlugs = new Set(adminBooks.map((b) => b.slug))

  const seedWithSource: MergedBook[] = SEED_BOOKS
    .filter((b) => !adminSlugs.has(b.slug))
    .map((b) => ({ ...b, source: 'seed' as const }))

  const adminWithSource: MergedBook[] = adminBooks.map((b) => ({
    ...b,
    createdAt: new Date(b.createdAt),
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

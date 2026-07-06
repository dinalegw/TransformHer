import 'server-only'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import { eq, and } from 'drizzle-orm'
import { getDb } from '@/lib/db/connection'
import { userPurchases, cart as cartTable } from '@/lib/db/schema'
import { SEED_BOOKS } from '@/lib/seed'

interface LibraryItem {
  id: number
  userId: string
  bookId: number
  bookSlug: string
  purchaseDate: string
}

interface LibraryStore {
  items: LibraryItem[]
}

declare global {
  var __libraryStore: LibraryStore | undefined
  var __cartStore: CartStore | undefined
}

function getDataDir(): string {
  return join(process.cwd(), 'data')
}

function getLibraryFile(): string {
  return join(getDataDir(), 'library.json')
}

function getCartFile(): string {
  return join(getDataDir(), 'cart.json')
}

function loadLibraryStore(): LibraryStore {
  try {
    const file = getLibraryFile()
    if (existsSync(file)) {
      const raw = readFileSync(file, 'utf-8')
      const store: LibraryStore = JSON.parse(raw)
      const seen = new Set<string>()
      store.items = store.items.filter(i => {
        const key = `${i.userId}:${i.bookId}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      saveLibraryStore(store)
      return store
    }
  } catch {}
  return { items: [] }
}

function saveLibraryStore(store: LibraryStore): void {
  try {
    const dir = getDataDir()
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    writeFileSync(getLibraryFile(), JSON.stringify(store, null, 2), 'utf-8')
  } catch {}
}

function getLibraryStore(): LibraryStore {
  if (globalThis.__libraryStore) {
    const seen = new Set<string>()
    globalThis.__libraryStore.items = globalThis.__libraryStore.items.filter(i => {
      const key = `${i.userId}:${i.bookId}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  } else {
    globalThis.__libraryStore = loadLibraryStore()
  }
  return globalThis.__libraryStore
}

function getBookSlugById(bookId: number): string {
  const book = SEED_BOOKS.find(b => b.id === bookId)
  return book?.slug ?? ''
}

export async function fetchLibrary(userId: string): Promise<LibraryItem[]> {
  const db = getDb()
  if (db) {
    const rows = await db.select()
      .from(userPurchases)
      .where(eq(userPurchases.userId, userId))
    return rows.map(r => ({
      id: r.id,
      userId: r.userId,
      bookId: r.bookId,
      bookSlug: r.bookSlug,
      purchaseDate: r.purchaseDate.toISOString(),
    }))
  }
  const store = getLibraryStore()
  return store.items.filter(i => i.userId === userId)
}

export async function getLibraryItem(userId: string, bookId: number): Promise<LibraryItem | null> {
  const db = getDb()
  if (db) {
    const rows = await db.select()
      .from(userPurchases)
      .where(and(eq(userPurchases.userId, userId), eq(userPurchases.bookId, bookId)))
      .limit(1)
    if (rows.length === 0) return null
    const r = rows[0]
    return { id: r.id, userId: r.userId, bookId: r.bookId, bookSlug: r.bookSlug, purchaseDate: r.purchaseDate.toISOString() }
  }
  const store = getLibraryStore()
  return store.items.find(i => i.userId === userId && i.bookId === bookId) ?? null
}

export async function addToLibrary(userId: string, bookId: number, bookSlug: string): Promise<void> {
  const db = getDb()
  if (db) {
    const existing = await db.select({ id: userPurchases.id })
      .from(userPurchases)
      .where(and(eq(userPurchases.userId, userId), eq(userPurchases.bookId, bookId)))
      .limit(1)
    if (existing.length > 0) throw new Error('Book already in library')
    await db.insert(userPurchases).values({ userId, bookId, bookSlug })
    return
  }
  const store = getLibraryStore()
  if (store.items.some(i => i.userId === userId && i.bookId === bookId)) {
    throw new Error('Book already in library')
  }
  const maxId = store.items.reduce((max, i) => Math.max(max, i.id), 0)
  store.items.push({
    id: maxId + 1,
    userId,
    bookId,
    bookSlug,
    purchaseDate: new Date().toISOString(),
  })
  saveLibraryStore(store)
}

export async function removeFromLibrary(userId: string, bookId: number): Promise<void> {
  const db = getDb()
  if (db) {
    await db.delete(userPurchases)
      .where(and(eq(userPurchases.userId, userId), eq(userPurchases.bookId, bookId)))
    return
  }
  const store = getLibraryStore()
  store.items = store.items.filter(i => !(i.userId === userId && i.bookId === bookId))
  saveLibraryStore(store)
}

/* ─── Cart ────────────────────────────────────────────────────────── */

interface CartItem {
  id: number
  userId: string
  bookId: number
  addedAt: string
}

interface CartStore {
  items: CartItem[]
}

function loadCartStore(): CartStore {
  try {
    const file = getCartFile()
    if (existsSync(file)) {
      const raw = readFileSync(file, 'utf-8')
      return JSON.parse(raw)
    }
  } catch {}
  return { items: [] }
}

function saveCartStore(store: CartStore): void {
  try {
    const dir = getDataDir()
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    writeFileSync(getCartFile(), JSON.stringify(store, null, 2), 'utf-8')
  } catch {}
}

function getCartStore(): CartStore {
  if (globalThis.__cartStore) {
    const seen = new Set<string>()
    globalThis.__cartStore.items = globalThis.__cartStore.items.filter(i => {
      const key = `${i.userId}:${i.bookId}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  } else {
    globalThis.__cartStore = loadCartStore()
  }
  return globalThis.__cartStore
}

export async function fetchCart(userId: string): Promise<CartItem[]> {
  const db = getDb()
  if (db) {
    const rows = await db.select()
      .from(cartTable)
      .where(eq(cartTable.userId, userId))
    return rows.map(r => ({
      id: r.id,
      userId: r.userId,
      bookId: r.bookId,
      addedAt: r.addedAt.toISOString(),
    }))
  }
  const store = getCartStore()
  return store.items.filter(i => i.userId === userId)
}

export async function getCartItem(userId: string, bookId: number): Promise<CartItem | null> {
  const db = getDb()
  if (db) {
    const rows = await db.select()
      .from(cartTable)
      .where(and(eq(cartTable.userId, userId), eq(cartTable.bookId, bookId)))
      .limit(1)
    if (rows.length === 0) return null
    const r = rows[0]
    return { id: r.id, userId: r.userId, bookId: r.bookId, addedAt: r.addedAt.toISOString() }
  }
  const store = getCartStore()
  return store.items.find(i => i.userId === userId && i.bookId === bookId) ?? null
}

export async function addToCart(userId: string, bookId: number): Promise<void> {
  const owned = await getLibraryItem(userId, bookId)
  if (owned) throw new Error('You already own this book')

  const db = getDb()
  if (db) {
    const existing = await db.select({ id: cartTable.id })
      .from(cartTable)
      .where(and(eq(cartTable.userId, userId), eq(cartTable.bookId, bookId)))
      .limit(1)
    if (existing.length > 0) return
    await db.insert(cartTable).values({ userId, bookId })
    return
  }
  const store = getCartStore()
  const existing = store.items.find(i => i.userId === userId && i.bookId === bookId)
  if (existing) return
  const maxId = store.items.reduce((max, i) => Math.max(max, i.id), 0)
  store.items.push({
    id: maxId + 1,
    userId,
    bookId,
    addedAt: new Date().toISOString(),
  })
  saveCartStore(store)
}

export async function removeFromCart(userId: string, bookId: number): Promise<void> {
  const db = getDb()
  if (db) {
    await db.delete(cartTable)
      .where(and(eq(cartTable.userId, userId), eq(cartTable.bookId, bookId)))
    return
  }
  const store = getCartStore()
  store.items = store.items.filter(i => !(i.userId === userId && i.bookId === bookId))
  saveCartStore(store)
}

export async function checkoutCart(userId: string, paymentReference?: string): Promise<void> {
  const db = getDb()
  if (db) {
    const items = await db.select()
      .from(cartTable)
      .where(eq(cartTable.userId, userId))
    for (const item of items) {
      const existing = await db.select({ id: userPurchases.id })
        .from(userPurchases)
        .where(and(eq(userPurchases.userId, userId), eq(userPurchases.bookId, item.bookId)))
        .limit(1)
      if (existing.length === 0) {
        const slug = getBookSlugById(item.bookId)
        await db.insert(userPurchases).values({
          userId,
          bookId: item.bookId,
          bookSlug: slug,
          paymentReference,
        })
      }
      await db.delete(cartTable)
        .where(and(eq(cartTable.userId, userId), eq(cartTable.bookId, item.bookId)))
    }
    return
  }

  const store = getCartStore()
  const libStore = getLibraryStore()
  const cartItems = store.items.filter(i => i.userId === userId)
  let nextId = (libStore.items.reduce((max, i) => Math.max(max, i.id), 0)) + 1
  for (const item of cartItems) {
    const alreadyOwned = libStore.items.some(i => i.userId === userId && i.bookId === item.bookId)
    if (!alreadyOwned) {
      const slug = getBookSlugById(item.bookId)
      libStore.items.push({
        id: nextId++,
        userId: item.userId,
        bookId: item.bookId,
        bookSlug: slug,
        purchaseDate: new Date().toISOString(),
      })
    }
  }
  store.items = store.items.filter(i => i.userId !== userId)
  saveLibraryStore(libStore)
  saveCartStore(store)
}

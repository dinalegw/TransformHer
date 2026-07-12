import 'server-only'
import { eq, sql } from 'drizzle-orm'
import { getDb, isUsingLocalDb } from './connection'
import { books } from './schema'
import { SEED_BOOKS } from '@/lib/seed'

let _seedingBooks = false

export async function seedInitialBooks(): Promise<void> {
  if (_seedingBooks) return
  _seedingBooks = true

  try {
    const db = await getDb()
    if (!db) return

    const existing = await db.select({ count: sql<number>`count(*)` }).from(books)
    if (existing[0]?.count && existing[0].count > 0) return

    const now = new Date()
    for (const seed of SEED_BOOKS) {
      try {
        const slugExists = await db.select({ id: books.id })
          .from(books)
          .where(eq(books.slug, seed.slug))
          .limit(1)

        if (slugExists.length > 0) continue

        await db.insert(books).values({
          slug: seed.slug,
          title: seed.title,
          author: seed.author,
          category: seed.category as typeof books.$inferSelect['category'],
          price: seed.price,
          currency: seed.currency as typeof books.$inferSelect['currency'],
          coverImage: seed.coverImage,
          tagline: seed.tagline,
          description: seed.description,
          rating: seed.rating,
          reviewsCount: seed.reviewsCount,
          pages: seed.pages,
          featured: seed.featured,
          bestseller: seed.bestseller,
          source: 'seed',
          archived: false,
          deleted: false,
          createdAt: seed.createdAt,
          updatedAt: now,
        })
      } catch {
        // skip duplicate inserts silently
      }
    }

    console.log(`[seed] Seeded ${SEED_BOOKS.length} books into the database`)
  } catch (err) {
    console.error('[seed] Failed to seed books:', err)
  } finally {
    _seedingBooks = false
  }
}

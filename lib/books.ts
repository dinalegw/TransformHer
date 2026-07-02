import 'server-only'
import { SEED_BOOKS, type SeedBook } from '@/lib/seed'

export type Book = SeedBook

export { CATEGORIES } from '@/lib/constants'

export async function getFeaturedBooks(limit = 6): Promise<Book[]> {
  return SEED_BOOKS.filter((b) => b.featured)
    .sort((a, b) => b.reviewsCount - a.reviewsCount)
    .slice(0, limit)
}

export async function getBestsellers(limit = 4): Promise<Book[]> {
  return SEED_BOOKS.filter((b) => b.bestseller)
    .sort((a, b) => Number(b.rating) - Number(a.rating))
    .slice(0, limit)
}

export async function getAllBooks(opts?: {
  q?: string
  category?: string
  sort?: 'popular' | 'newest' | 'price-asc' | 'price-desc'
}): Promise<Book[]> {
  let results = [...SEED_BOOKS]

  if (opts?.q) {
    const q = opts.q.toLowerCase()
    results = results.filter(
      (b) =>
        b.title.toLowerCase().includes(q) ||
        b.author.toLowerCase().includes(q) ||
        b.tagline.toLowerCase().includes(q),
    )
  }

  if (opts?.category && opts.category !== 'All') {
    results = results.filter((b) => b.category === opts.category)
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
  return SEED_BOOKS.find((b) => b.slug === slug)
}

export async function getRelatedBooks(
  category: string,
  excludeSlug: string,
  limit = 3,
): Promise<Book[]> {
  return SEED_BOOKS.filter((b) => b.category === category && b.slug !== excludeSlug).slice(
    0,
    limit,
  )
}

export async function getCategoryCounts(): Promise<Record<string, number>> {
  const counts: Record<string, number> = {}
  for (const b of SEED_BOOKS) {
    counts[b.category] = (counts[b.category] || 0) + 1
  }
  return counts
}

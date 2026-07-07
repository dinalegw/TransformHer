import 'server-only'
import { SEED_BOOKS, type SeedBook } from '@/lib/seed'
import { getAllMergedBooks } from '@/lib/admin-books'

export type Book = SeedBook

export { CATEGORIES } from '@/lib/constants'

function matchesQuery(book: { title: string; author: string; tagline?: string }, q: string): boolean {
  const query = q.toLowerCase()
  return (
    book.title.toLowerCase().includes(query) ||
    book.author.toLowerCase().includes(query) ||
    (book.tagline && book.tagline.toLowerCase().includes(query))
  )
}

export async function getFeaturedBooks(limit = 6): Promise<Book[]> {
  const merged = await getAllMergedBooks()
  const featured = merged
    .filter((b) => b.featured)
    .sort((a, b) => b.reviewsCount - a.reviewsCount)
    .slice(0, limit)
  return featured as Book[]
}

export async function getBestsellers(limit = 4): Promise<Book[]> {
  const merged = await getAllMergedBooks()
  const bestsellers = merged
    .filter((b) => b.bestseller)
    .sort((a, b) => Number(b.rating) - Number(a.rating))
    .slice(0, limit)
  return bestsellers as Book[]
}

export async function getAllBooks(opts?: {
  q?: string
  category?: string
  sort?: 'popular' | 'newest' | 'price-asc' | 'price-desc'
}): Promise<Book[]> {
  const merged = await getAllMergedBooks()
  let results = [...merged]

  if (opts?.q) {
    results = results.filter((b) => matchesQuery(b, opts.q!))
  }

  if (opts?.category && opts.category !== 'All') {
    results = results.filter((b) => b.category === opts.category)
  }

  switch (opts?.sort) {
    case 'newest':
      results.sort((a, b) => {
        const aDate = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt).getTime()
        const bDate = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt).getTime()
        return bDate - aDate
      })
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

  return results as Book[]
}

export async function getBookBySlug(slug: string): Promise<Book | undefined> {
  const merged = await getAllMergedBooks()
  const book = merged.find((b) => b.slug === slug)
  if (book?.archived) return undefined
  return book as Book | undefined
}

export async function getRelatedBooks(
  category: string,
  excludeSlug: string,
  limit = 3,
): Promise<Book[]> {
  const merged = await getAllMergedBooks()
  return merged
    .filter((b) => b.category === category && b.slug !== excludeSlug && !b.archived)
    .slice(0, limit) as Book[]
}

export async function getCategoryCounts(): Promise<Record<string, number>> {
  const merged = await getAllMergedBooks()
  const counts: Record<string, number> = {}
  for (const b of merged) {
    counts[b.category] = (counts[b.category] || 0) + 1
  }
  return counts
}

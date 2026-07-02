import type { Metadata } from 'next'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { BookCard } from '@/components/book-card'
import { CatalogControls } from '@/components/catalog-controls'
import { getAllBooks } from '@/lib/books'

export const metadata: Metadata = {
  title: 'The Library',
  description:
    'Browse the full TransformHer library of transformational books for women.',
}

type SortOption = 'popular' | 'newest' | 'price-asc' | 'price-desc'

export default async function BooksPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; sort?: string }>
}) {
  const params = await searchParams
  const q = params.q ?? ''
  const category = params.category ?? 'All'
  const sort = (params.sort as SortOption) ?? 'popular'

  const books = await getAllBooks({ q, category, sort })

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="flex-1">
        <section className="border-b border-border/60 bg-secondary/40">
          <div className="mx-auto max-w-6xl px-4 py-14 md:px-6">
            <p className="text-xs uppercase tracking-luxe text-primary">
              The TransformHer Library
            </p>
            <h1 className="mt-3 font-heading text-4xl text-foreground md:text-5xl">
              Every book, one collection.
            </h1>
            <p className="mt-4 max-w-xl leading-relaxed text-muted-foreground">
              Search, filter, and find the words for wherever you are on your
              journey.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-10 md:px-6">
          <CatalogControls category={category} sort={sort} q={q} />

          <p className="mt-8 text-sm text-muted-foreground">
            {books.length} {books.length === 1 ? 'book' : 'books'}
            {category !== 'All' ? ` in ${category}` : ''}
            {q ? ` matching "${q}"` : ''}
          </p>

          {books.length > 0 ? (
            <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-4">
              {books.map((book) => (
                <BookCard key={book.id} book={book} />
              ))}
            </div>
          ) : (
            <div className="mt-16 flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20 text-center">
              <h2 className="font-heading text-xl text-foreground">
                No books found
              </h2>
              <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                Try adjusting your search or exploring a different category.
              </p>
            </div>
          )}
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}

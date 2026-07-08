import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { fetchLibrary, releasePendingBooks } from '@/lib/library'
import { getAllMergedBooks } from '@/lib/admin-books'
import { sendBookReleasedEmail } from '@/lib/email'
import { getBaseUrl } from '@/lib/utils'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { LibraryGrid } from './library-grid'

export const metadata: Metadata = {
  title: 'My Library',
  description: 'Books you own.',
}

export default async function LibraryPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const isMasterAdmin = user.role === 'master_admin'

  const justReleased = isMasterAdmin ? [] : await releasePendingBooks(user.id)

  const allBooks = await getAllMergedBooks({ includeArchived: true })
  const bookBySlug = new Map(allBooks.map((b) => [b.slug, b]))

  for (const item of justReleased) {
    const book = bookBySlug.get(item.bookSlug)
    if (book) {
      try {
        await sendBookReleasedEmail(
          user.email,
          user.name,
          book.title,
          `${getBaseUrl()}/books/${book.slug}`,
        )
      } catch (err) {
        console.error('Failed to send release email:', err)
      }
    }
  }

  if (isMasterAdmin) {
    const masterBooks = allBooks
      .filter(b => !b.archived)
      .map(b => ({
        id: 0,
        userId: user.id,
        bookId: typeof b.id === 'number' ? b.id : 0,
        bookSlug: b.slug,
        purchaseDate: new Date().toISOString(),
        released: true,
        releaseAt: null,
        book: b as typeof b & { fileUrl?: string },
      }))

    return (
      <div className="flex min-h-svh flex-col">
        <SiteHeader />
        <main className="flex-1">
          <section className="border-b border-border/60 bg-secondary/40">
            <div className="mx-auto max-w-6xl px-4 py-10 md:px-6">
              <p className="text-xs uppercase tracking-luxe text-primary">Master Admin Access</p>
              <h1 className="mt-2 font-heading text-3xl text-foreground md:text-4xl">
                Full Library
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {masterBooks.length} {masterBooks.length === 1 ? 'book' : 'books'} — you have access to all books
              </p>
            </div>
          </section>
          <section className="mx-auto max-w-6xl px-4 py-10 md:px-6">
            <LibraryGrid items={masterBooks} />
          </section>
        </main>
        <SiteFooter />
      </div>
    )
  }

  const items = await fetchLibrary(user.id, true)
  const books = items
    .map(i => {
      const book = bookBySlug.get(i.bookSlug)
      return book ? { ...i, book } : null
    })
    .filter((b): b is NonNullable<typeof b> => b != null)

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="flex-1">
        <section className="border-b border-border/60 bg-secondary/40">
          <div className="mx-auto max-w-6xl px-4 py-10 md:px-6">
            <p className="text-xs uppercase tracking-luxe text-primary">Your Collection</p>
            <h1 className="mt-2 font-heading text-3xl text-foreground md:text-4xl">
              My Library
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {books.length} {books.length === 1 ? 'book' : 'books'}
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-10 md:px-6">
          <LibraryGrid items={books} />
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}

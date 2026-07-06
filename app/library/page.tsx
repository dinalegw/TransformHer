import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { fetchLibrary } from '@/lib/library'
import { SEED_BOOKS } from '@/lib/seed'
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

  const items = await fetchLibrary(user.id)
  const books = items
    .map(i => SEED_BOOKS.find(b => b.id === i.bookId))
    .filter((b): b is typeof SEED_BOOKS[number] => b != null)

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
          <LibraryGrid books={books} />
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}

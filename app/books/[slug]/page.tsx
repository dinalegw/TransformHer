import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, FileText, Check, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { BookCard } from '@/components/book-card'
import { PaystackButton } from '@/components/paystack-button'
import { getBookBySlug, getRelatedBooks } from '@/lib/books'
import { formatPrice } from '@/lib/format'
import { getCurrentUser } from '@/lib/auth'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const book = await getBookBySlug(slug)
  if (!book) return { title: 'Book not found' }
  return {
    title: book.title,
    description: book.tagline,
  }
}

export default async function BookDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ purchased?: string }>
}) {
  const { slug } = await params
  const { purchased } = await searchParams
  const book = await getBookBySlug(slug)
  if (!book) notFound()

  const related = await getRelatedBooks(book.category, book.slug, 4)
  const user = await getCurrentUser()

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-4 py-8 md:px-6">
          <Button asChild variant="ghost" size="sm" className="mb-6 -ml-2">
            <Link href="/books">
              <ArrowLeft className="size-4" />
              Back to library
            </Link>
          </Button>

          {purchased === 'true' && (
            <div className="mb-8 rounded-xl border border-green-200 bg-green-50 px-5 py-4 text-sm text-green-800">
              Thank you for your purchase! You now own <strong>{book.title}</strong>.
            </div>
          )}

          <div className="grid gap-10 md:grid-cols-[minmax(0,340px)_1fr] md:gap-14">
            <div className="mx-auto w-full max-w-xs md:mx-0">
              <div className="relative aspect-[2/3] overflow-hidden rounded-xl shadow-2xl ring-1 ring-border">
                <Image
                  src={book.coverImage || '/placeholder.svg'}
                  alt={`Cover of ${book.title} by ${book.author}`}
                  fill
                  priority
                  sizes="(max-width: 768px) 80vw, 340px"
                  className="object-cover"
                />
              </div>
            </div>

            <div>
              <p className="text-xs uppercase tracking-luxe text-primary">
                {book.category}
              </p>
              <h1 className="mt-3 font-heading text-4xl leading-tight text-foreground text-balance md:text-5xl">
                {book.title}
              </h1>
              <p className="mt-3 text-lg text-muted-foreground">
                by {book.author}
              </p>

              <div className="mt-5 flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Star className="size-4 fill-primary text-primary" />
                  <span className="font-medium text-foreground">
                    {Number(book.rating).toFixed(1)}
                  </span>
                  ({book.reviewsCount.toLocaleString()} reviews)
                </span>
                <span className="flex items-center gap-1.5">
                  <FileText className="size-4" />
                  {book.pages} pages
                </span>
              </div>

              <p className="mt-6 font-heading text-xl italic text-foreground/90">
                {'\u201C'}
                {book.tagline}
                {'\u201D'}
              </p>

              <p className="mt-5 max-w-xl leading-relaxed text-muted-foreground">
                {book.description}
              </p>

              <Separator className="my-8" />

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <span className="font-heading text-3xl text-foreground">
                  {formatPrice(book.price, book.currency)}
                </span>
                <div className="flex flex-1 flex-wrap gap-3">
                  {user ? (
                    <PaystackButton
                      bookSlug={book.slug}
                      bookTitle={book.title}
                      amount={Number(book.price)}
                      email={user.email}
                    />
                  ) : (
                    <Button asChild size="lg" className="rounded-full px-8">
                      <Link href={`/login?redirect=/books/${book.slug}`}>
                        Sign in to purchase
                      </Link>
                    </Button>
                  )}
                  <Button
                    size="lg"
                    variant="outline"
                    className="rounded-full px-8"
                  >
                    Add to Library
                  </Button>
                </div>
              </div>

              <ul className="mt-8 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                {[
                  'Instant access after purchase',
                  'Read on any device',
                  'Lifetime ownership',
                  'Bookmarks & highlights',
                ].map((perk) => (
                  <li key={perk} className="flex items-center gap-2">
                    <Check className="size-4 text-primary" />
                    {perk}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {related.length > 0 && (
            <section className="mt-20">
              <h2 className="font-heading text-2xl text-foreground">
                More in {book.category}
              </h2>
              <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-4">
                {related.map((b) => (
                  <BookCard key={b.id} book={b} />
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}

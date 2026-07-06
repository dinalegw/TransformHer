import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, FileText, Check, Star, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { BookCard } from '@/components/book-card'
import { PaystackButton } from '@/components/paystack-button'
import { AddToCartButton } from '@/components/add-to-cart-button'
import { getBookBySlug, getRelatedBooks } from '@/lib/books'
import { formatPrice } from '@/lib/format'
import { getCurrentUser } from '@/lib/auth'
import { verifyPaystackPayment } from '@/lib/paystack'
import { sendOrderConfirmation, sendAdminOrderNotification } from '@/lib/email'
import { getLibraryItem, addToLibrary, fetchLibrary } from '@/lib/library'

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
  searchParams: Promise<{ purchased?: string; reference?: string; trxref?: string }>
}) {
  const { slug } = await params
  const { purchased, reference, trxref } = await searchParams
  const book = await getBookBySlug(slug)
  if (!book) notFound()

  const user = await getCurrentUser()
  const ownedItem = user ? await getLibraryItem(user.id, book.id) : null
  const isOwned = !!ownedItem
  let alreadyOwned = false

  if (purchased === 'true') {
    const ref = reference ?? trxref
    if (ref) {
      try {
        const result = await verifyPaystackPayment(ref)
        if (result.status && result.data?.metadata) {
          const { userId: purchaseUserId, bookTitle } = result.data.metadata
          const customerEmail = result.data.customer?.email ?? ''
          const amount = formatPrice(Number(result.data.amount) / 100, result.data.currency ?? 'NGN')

          const purchaserId = purchaseUserId as string | undefined
          if (purchaserId && user) {
            const existing = await getLibraryItem(purchaserId, book.id)
            if (!existing) {
              await addToLibrary(purchaserId, book.id, book.slug)
            } else {
              alreadyOwned = true
            }
          }

          if (customerEmail) {
            await sendOrderConfirmation(customerEmail, bookTitle ?? book.title, amount)
          }

          const adminEmail = process.env.ADMIN_EMAIL
          if (adminEmail && customerEmail) {
            await sendAdminOrderNotification(
              adminEmail,
              customerEmail,
              result.data.customer?.first_name
                ? `${result.data.customer.first_name} ${result.data.customer.last_name ?? ''}`.trim()
                : 'Customer',
              bookTitle ?? book.title,
              amount,
            )
          }
        }
      } catch (err) {
        console.error('Payment verification failed:', err)
      }
    }
  }

  const related = await getRelatedBooks(book.category, book.slug, 4)
  const ownedIds = user ? new Set((await fetchLibrary(user.id)).map(i => i.bookId)) : new Set<number>()

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
              {alreadyOwned
                ? <><strong>{book.title}</strong> is already in your library.</>
                : <>Thank you for your purchase! You now own <strong>{book.title}</strong>.</>}
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

              {isOwned ? (
                <div className="flex flex-wrap items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-5 py-4">
                  <BookOpen className="size-5 text-green-700" />
                  <span className="font-heading text-lg text-green-800">
                    In Your Library
                  </span>
                  <Button asChild size="sm" variant="outline" className="ml-auto rounded-full">
                    <Link href="/library">Go to Library</Link>
                  </Button>
                </div>
              ) : (
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
                    {user && <AddToCartButton bookId={book.id} />}
                  </div>
                </div>
              )}

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
                  <BookCard key={b.id} book={b} owned={ownedIds.has(b.id)} />
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

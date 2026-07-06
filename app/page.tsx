import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, BookOpen, Sparkles, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { BookCard } from '@/components/book-card'
import { CATEGORIES } from '@/lib/constants'
import {
  getBestsellers,
  getCategoryCounts,
  getFeaturedBooks,
} from '@/lib/books'
import { getCurrentUser } from '@/lib/auth'
import { fetchLibrary } from '@/lib/library'

export default async function HomePage() {
  const [featured, bestsellers, counts, user] = await Promise.all([
    getFeaturedBooks(4),
    getBestsellers(1),
    getCategoryCounts(),
    getCurrentUser(),
  ])
  const ownedIds = user ? new Set((await fetchLibrary(user.id)).map(i => i.bookId)) : new Set<number>()
  const spotlight = bestsellers[0]

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-2 md:px-6 md:py-24">
            <div>
              <p className="flex items-center gap-2 text-xs uppercase tracking-luxe text-primary">
                <Sparkles className="size-4" />
                Transformational books for women
              </p>
              <h1 className="mt-5 font-heading text-4xl leading-[1.05] text-foreground text-balance md:text-6xl">
                Become the woman you were always meant to be.
              </h1>
              <p className="mt-6 max-w-md text-base leading-relaxed text-muted-foreground">
                A curated library of books on confidence, wealth, wellness, and
                purpose {'\u2014'} beautifully written to help you grow into
                your next self.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Button asChild size="lg" className="rounded-full px-8">
                  <Link href="/books">
                    Explore the Library
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="rounded-full px-8"
                >
                  <Link href="#featured">Featured Reads</Link>
                </Button>
              </div>
              <div className="mt-10 flex items-center gap-6 text-sm text-muted-foreground">
                <div>
                  <span className="font-heading text-2xl text-foreground">
                    {Object.values(counts).reduce((a, b) => a + b, 0)}+
                  </span>
                  <p>Curated titles</p>
                </div>
                <div className="h-8 w-px bg-border" />
                <div>
                  <span className="font-heading text-2xl text-foreground">
                    6
                  </span>
                  <p>Life-shaping themes</p>
                </div>
                <div className="h-8 w-px bg-border" />
                <div>
                  <span className="flex items-center gap-1 font-heading text-2xl text-foreground">
                    4.8
                    <Star className="size-4 fill-primary text-primary" />
                  </span>
                  <p>Reader rating</p>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="relative aspect-[4/5] overflow-hidden rounded-2xl ring-1 ring-border shadow-2xl">
                <Image
                  src="/hero-reading.png"
                  alt="An elegant woman reading in a warm, sophisticated setting"
                  fill
                  priority
                  sizes="(max-width: 768px) 100vw, 45vw"
                  className="object-cover"
                />
              </div>
              {spotlight && (
                <Link
                  href={`/books/${spotlight.slug}`}
                  className="absolute -bottom-6 -left-4 hidden w-56 items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-xl sm:flex"
                >
                  <div className="relative h-20 w-14 shrink-0 overflow-hidden rounded-md">
                    <Image
                      src={spotlight.coverImage || '/placeholder.svg'}
                      alt={spotlight.title}
                      fill
                      sizes="56px"
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-luxe text-primary">
                      Bestseller
                    </p>
                    <p className="font-heading text-sm leading-tight text-foreground">
                      {spotlight.title}
                    </p>
                  </div>
                </Link>
              )}
            </div>
          </div>
        </section>

        {/* Categories */}
        <section
          id="categories"
          className="border-y border-border/60 bg-secondary/40"
        >
          <div className="mx-auto max-w-6xl px-4 py-14 md:px-6">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs uppercase tracking-luxe text-primary">
                  Find your theme
                </p>
                <h2 className="mt-2 font-heading text-3xl text-foreground">
                  Browse by category
                </h2>
              </div>
            </div>
            <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3">
              {CATEGORIES.map((category) => (
                <Link
                  key={category}
                  href={`/books?category=${encodeURIComponent(category)}`}
                  className="group flex items-center justify-between rounded-xl border border-border bg-card px-5 py-6 transition-colors hover:border-primary"
                >
                  <div>
                    <h3 className="font-heading text-lg text-foreground">
                      {category}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {counts[category] ?? 0} titles
                    </p>
                  </div>
                  <ArrowRight className="size-5 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Featured */}
        <section
          id="featured"
          className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-20"
        >
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs uppercase tracking-luxe text-primary">
                Handpicked for you
              </p>
              <h2 className="mt-2 font-heading text-3xl text-foreground">
                Featured reads
              </h2>
            </div>
            <Button asChild variant="ghost" className="hidden md:inline-flex">
              <Link href="/books">
                View all
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
          <div className="mt-10 grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-4">
            {featured.map((book) => (
              <BookCard key={book.id} book={book} owned={ownedIds.has(book.id)} />
            ))}
          </div>
        </section>

        {/* About */}
        <section id="about" className="bg-accent text-accent-foreground">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-2 md:px-6 md:py-20">
            <div>
              <p className="text-xs uppercase tracking-luxe text-primary">
                Our promise
              </p>
              <h2 className="mt-3 font-heading text-3xl leading-tight text-balance md:text-4xl">
                More than books {'\u2014'} a companion for who you
                {'\u2019'}re becoming.
              </h2>
              <p className="mt-6 max-w-md leading-relaxed text-accent-foreground/75">
                Every title in the library is chosen with
                intention: to challenge, comfort, and carry you forward. Read
                beautifully on any device, and return to the words that meet you
                exactly where you are.
              </p>
              <Button asChild className="mt-8 rounded-full px-8">
                <Link href="/books">
                  Start reading
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                {
                  icon: BookOpen,
                  title: 'Curated with care',
                  body: 'A library edited for depth, not noise.',
                },
                {
                  icon: Sparkles,
                  title: 'Beautifully designed',
                  body: 'A reading experience worthy of the words.',
                },
                {
                  icon: Star,
                  title: 'Loved by readers',
                  body: 'Thousands of women reading and rising.',
                },
                {
                  icon: ArrowRight,
                  title: 'Yours to keep',
                  body: 'Own your library and read on any device.',
                },
              ].map((f) => (
                <div
                  key={f.title}
                  className="rounded-xl border border-accent-foreground/15 bg-accent-foreground/5 p-5"
                >
                  <f.icon className="size-6 text-primary" />
                  <h3 className="mt-3 font-heading text-lg">{f.title}</h3>
                  <p className="mt-1 text-sm text-accent-foreground/70">
                    {f.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}

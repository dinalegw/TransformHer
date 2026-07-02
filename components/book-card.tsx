import Image from 'next/image'
import Link from 'next/link'
import { Star } from 'lucide-react'
import type { Book } from '@/lib/db/schema'
import { formatPrice } from '@/lib/format'

export function BookCard({ book }: { book: Book }) {
  return (
    <Link
      href={`/books/${book.slug}`}
      className="group flex flex-col"
      aria-label={`View ${book.title}`}
    >
      <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-secondary shadow-sm ring-1 ring-border/60 transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-xl">
        <Image
          src={book.coverImage || '/placeholder.svg'}
          alt={`Cover of ${book.title} by ${book.author}`}
          fill
          sizes="(max-width: 768px) 45vw, 22vw"
          className="object-cover"
        />
        {book.bestseller && (
          <span className="absolute left-3 top-3 rounded-full bg-primary px-3 py-1 text-[10px] font-medium uppercase tracking-luxe text-primary-foreground">
            Bestseller
          </span>
        )}
      </div>

      <div className="mt-4 flex flex-1 flex-col">
        <p className="text-[11px] uppercase tracking-luxe text-primary">
          {book.category}
        </p>
        <h3 className="mt-1.5 font-heading text-lg leading-snug text-foreground text-balance">
          {book.title}
        </h3>
        <p className="mt-0.5 text-sm text-muted-foreground">{book.author}</p>

        <div className="mt-3 flex items-center justify-between">
          <span className="font-medium text-foreground">
            {formatPrice(book.price, book.currency)}
          </span>
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            <Star className="size-3.5 fill-primary text-primary" />
            {Number(book.rating).toFixed(1)}
          </span>
        </div>
      </div>
    </Link>
  )
}

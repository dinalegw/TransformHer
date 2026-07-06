'use client'

import { BookCard } from '@/components/book-card'
import type { SeedBook } from '@/lib/seed'
import { BookOpen, Clock } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface LibraryItemWithBook {
  id: number
  bookId: number
  bookSlug: string
  released: boolean
  book: SeedBook
}

export function LibraryGrid({ items }: { items: LibraryItemWithBook[] }) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <BookOpen className="size-12 text-muted-foreground/40" />
        <div>
          <p className="text-lg font-medium text-foreground">Your library is empty</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Purchase books to start building your collection
          </p>
        </div>
        <Button asChild className="rounded-full">
          <Link href="/books">Browse books</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-4">
      {items.map(({ book, released, bookId }) => (
        <div key={bookId} className="relative">
          <BookCard book={book} owned={released} />
          {!released && (
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1.5 rounded-b-xl bg-background/80 py-2 text-xs text-muted-foreground backdrop-blur-sm">
              <Clock className="size-3" />
              Unlocking within 72h
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

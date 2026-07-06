'use client'

import { BookCard } from '@/components/book-card'
import type { SeedBook } from '@/lib/seed'
import { BookOpen } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export function LibraryGrid({ books }: { books: SeedBook[] }) {
  if (books.length === 0) {
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
      {books.map(book => (
        <BookCard key={book.id} book={book} owned />
      ))}
    </div>
  )
}

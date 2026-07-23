'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { BookOpen, Clock, EyeOff, Eye, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface BookInfo {
  id: number | string
  slug: string
  title: string
  author: string
  category: string
  price: string
  currency: string
  coverImage: string
  fileUrl: string | null
  tagline?: string
  rating?: string
  featured?: boolean
  bestseller?: boolean
  source?: string
}

interface LibraryItemWithBook {
  id: number
  bookId: number
  bookSlug: string
  released: boolean
  archived?: boolean
  book: BookInfo
}

export function LibraryGrid({ items }: { items: LibraryItemWithBook[] }) {
  const router = useRouter()
  const [archiving, setArchiving] = useState<string | null>(null)
  const [showArchived, setShowArchived] = useState(false)

  const visibleItems = showArchived
    ? items
    : items.filter(i => !i.archived)

  const archivedItems = items.filter(i => i.archived)

  const toggleArchive = useCallback(async (bookSlug: string, currentlyArchived: boolean) => {
    setArchiving(bookSlug)
    try {
      const res = await fetch('/api/library/archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookSlug, archived: !currentlyArchived }),
      })
      if (!res.ok) throw new Error('Failed')
      router.refresh()
    } catch {
      // silently fail
    } finally {
      setArchiving(null)
    }
  }, [router])

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
    <div>
      {archivedItems.length > 0 && (
        <div className="mb-4 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {items.length - archivedItems.length} visible · {archivedItems.length} archived
          </p>
          <button
            type="button"
            onClick={() => setShowArchived((v) => !v)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            {showArchived ? <Eye className="size-3" /> : <EyeOff className="size-3" />}
            {showArchived ? 'Hide archived' : 'Show archived'}
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-4">
        {visibleItems.map(({ book, released, bookSlug, archived: itemArchived, bookId }) => (
          <div key={bookId} className="group relative">
            <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-secondary shadow-sm ring-1 ring-border/60">
              <Image
                src={book.coverImage || '/placeholder.svg'}
                alt={`Cover of ${book.title}`}
                fill
                sizes="(max-width: 768px) 50vw, 25vw"
                className="object-cover"
              />
              {book.bestseller && released && (
                <span className="absolute left-3 top-3 rounded-full bg-primary px-3 py-1 text-[10px] font-medium uppercase tracking-luxe text-primary-foreground">
                  Bestseller
                </span>
              )}
              {!released && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm">
                  <div className="flex flex-col items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="size-5" />
                    Unlocking within 72h
                  </div>
                </div>
              )}
              {itemArchived && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/40">
                  <span className="rounded-full bg-muted/80 px-3 py-1 text-[10px] font-medium text-muted-foreground">
                    Archived
                  </span>
                </div>
              )}
            </div>

            <div className="mt-3">
              <p className="text-[10px] uppercase tracking-luxe text-primary">
                {book.category}
              </p>
              <h3 className="mt-0.5 font-heading text-sm leading-snug text-foreground">
                {book.title}
              </h3>
              <p className="text-xs text-muted-foreground">{book.author}</p>
            </div>

            <div className="mt-2 flex items-center gap-2">
              {released && book.fileUrl && (
                <Button asChild variant="default" size="xs" className="rounded-full">
                  <Link href={`/api/books/${bookSlug}/read`} target="_blank">
                    <FileText className="size-3" />
                    Read
                  </Link>
                </Button>
              )}
              {released && !book.fileUrl && (
                <span className="text-[10px] text-muted-foreground">
                  Content pending
                </span>
              )}
              <button
                type="button"
                onClick={() => toggleArchive(bookSlug, !!itemArchived)}
                disabled={archiving === bookSlug}
                className="ml-auto text-muted-foreground/60 hover:text-foreground"
                aria-label={itemArchived ? 'Unhide' : 'Hide'}
              >
                {itemArchived ? (
                  <Eye className="size-3.5" />
                ) : (
                  <EyeOff className="size-3.5" />
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

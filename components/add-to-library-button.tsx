'use client'

import { useState, useEffect } from 'react'
import { Bookmark, BookmarkCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function AddToLibraryButton({
  bookId,
  bookSlug,
}: {
  bookId: number
  bookSlug: string
}) {
  const [inLibrary, setInLibrary] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/library')
      .then(r => r.json())
      .then((data) => {
        const items = Array.isArray(data) ? data : data?.items ?? []
        setInLibrary(items.some((i: { bookId: number }) => i.bookId === bookId))
      })
      .catch(() => {})
  }, [bookId])

  async function handleClick() {
    setLoading(true)
    try {
      if (inLibrary) {
        await fetch('/api/library', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookId }),
        })
        setInLibrary(false)
      } else {
        const res = await fetch('/api/library', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookId, bookSlug }),
        })
        if (res.ok) setInLibrary(true)
      }
    } catch {}
    setLoading(false)
  }

  return (
    <Button
      size="lg"
      variant={inLibrary ? 'default' : 'outline'}
      className="rounded-full px-8"
      onClick={handleClick}
      disabled={loading}
    >
      {inLibrary ? <BookmarkCheck className="size-4" /> : <Bookmark className="size-4" />}
      {inLibrary ? 'In Library' : 'Add to Library'}
    </Button>
  )
}

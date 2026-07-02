'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useState, useTransition } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { CATEGORIES } from '@/lib/constants'

const SORTS = [
  { value: 'popular', label: 'Most popular' },
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price: Low to high' },
  { value: 'price-desc', label: 'Price: High to low' },
]

export function CatalogControls({
  category,
  sort,
  q,
}: {
  category: string
  sort: string
  q: string
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [query, setQuery] = useState(q)

  const pushParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(updates)) {
        if (value && value !== 'All' && value !== 'popular') {
          params.set(key, value)
        } else {
          params.delete(key)
        }
      }
      startTransition(() => {
        router.push(`/books?${params.toString()}`, { scroll: false })
      })
    },
    [router, searchParams],
  )

  // Debounced search sync
  useEffect(() => {
    const t = setTimeout(() => {
      if (query !== q) pushParams({ q: query })
    }, 350)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  const chips = ['All', ...CATEGORIES]

  return (
    <div className="space-y-6" id="categories">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search titles or authors"
            className="pl-9"
            aria-label="Search books"
          />
        </div>
        <Select
          value={sort}
          onValueChange={(value) => pushParams({ sort: value })}
        >
          <SelectTrigger className="w-full sm:w-52" aria-label="Sort books">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            {SORTS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div
        className={cn(
          'flex flex-wrap gap-2 transition-opacity',
          isPending && 'opacity-60',
        )}
      >
        {chips.map((chip) => {
          const active =
            chip === category || (chip === 'All' && category === 'All')
          return (
            <button
              key={chip}
              type="button"
              onClick={() => pushParams({ category: chip })}
              className={cn(
                'rounded-full border px-4 py-1.5 text-sm transition-colors',
                active
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-card text-muted-foreground hover:border-primary hover:text-foreground',
              )}
            >
              {chip}
            </button>
          )
        })}
      </div>
    </div>
  )
}

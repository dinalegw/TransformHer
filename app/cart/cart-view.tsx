'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Trash2, ShoppingBag, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatPrice } from '@/lib/format'
import type { SeedBook } from '@/lib/seed'

interface CartItemWithBook {
  id: number
  bookId: number
  book: SeedBook
}

export function CartView({
  items,
  total,
}: {
  items: CartItemWithBook[]
  total: number
}) {
  const router = useRouter()
  const [checkingOut, setCheckingOut] = useState(false)

  async function handleCheckout() {
    setCheckingOut(true)
    try {
      const res = await fetch('/api/cart/checkout', { method: 'POST' })
      if (res.ok) {
        window.dispatchEvent(new CustomEvent('cart-updated'))
        router.push('/library')
        router.refresh()
      }
    } catch {}
    setCheckingOut(false)
  }

  async function handleRemove(bookId: number) {
    await fetch('/api/cart', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookId }),
    })
    window.dispatchEvent(new CustomEvent('cart-updated'))
    router.refresh()
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <ShoppingBag className="size-12 text-muted-foreground/40" />
        <div>
          <p className="text-lg font-medium text-foreground">Your cart is empty</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Add books to your cart to purchase them
          </p>
        </div>
        <Button asChild className="rounded-full">
          <Link href="/books">Browse books</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="divide-y divide-border rounded-xl border border-border">
        {items.map(item => (
          <div key={item.id} className="flex items-center gap-4 px-4 py-4">
            <div className="relative size-16 shrink-0 overflow-hidden rounded-lg">
              <Image
                src={item.book.coverImage || '/placeholder.svg'}
                alt={item.book.title}
                fill
                className="object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <Link
                href={`/books/${item.book.slug}`}
                className="text-sm font-medium text-foreground hover:underline"
              >
                {item.book.title}
              </Link>
              <p className="text-xs text-muted-foreground">{item.book.author}</p>
            </div>
            <div className="text-sm font-medium text-foreground">
              {formatPrice(item.book.price, item.book.currency)}
            </div>
            <button
              type="button"
              onClick={() => handleRemove(item.bookId)}
              className="shrink-0 text-muted-foreground hover:text-destructive"
              aria-label="Remove from cart"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between rounded-xl border border-border bg-card px-6 py-4">
        <div>
          <p className="text-sm text-muted-foreground">Total</p>
          <p className="font-heading text-2xl text-foreground">{formatPrice(total)}</p>
        </div>
        <Button
          size="lg"
          className="rounded-full px-8"
          onClick={handleCheckout}
          disabled={checkingOut}
        >
          {checkingOut ? 'Processing...' : 'Checkout'}
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  )
}

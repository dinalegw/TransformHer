'use client'

import { useState, useEffect } from 'react'
import { ShoppingCart, Check, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function AddToCartButton({
  bookId,
}: {
  bookId: number
}) {
  const [state, setState] = useState<'idle' | 'in-cart' | 'owned'>('idle')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/cart').then(r => r.json()),
      fetch('/api/library').then(r => r.json()),
    ])
      .then(([cartData, libData]) => {
        const cartItems = cartData?.items ?? []
        const libItems = Array.isArray(libData) ? libData : libData?.items ?? []
        if (libItems.some((i: { bookId: number }) => i.bookId === bookId)) {
          setState('owned')
        } else if (cartItems.some((i: { bookId: number }) => i.bookId === bookId)) {
          setState('in-cart')
        }
      })
      .catch(() => {})
  }, [bookId])

  async function handleClick() {
    if (state === 'owned') return
    setLoading(true)
    try {
      if (state === 'in-cart') {
        await fetch('/api/cart', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookId }),
        })
        setState('idle')
      } else {
        const res = await fetch('/api/cart', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookId }),
        })
        if (res.ok) setState('in-cart')
      }
    } catch {}
    setLoading(false)
  }

  const label = state === 'owned' ? 'In Library' : state === 'in-cart' ? 'In Cart' : 'Add to Cart'
  const Icon = state === 'owned' ? BookOpen : state === 'in-cart' ? Check : ShoppingCart
  const variant = state === 'owned' ? 'default' : 'outline'

  return (
    <Button
      size="lg"
      variant={variant}
      className="rounded-full px-8"
      onClick={handleClick}
      disabled={loading || state === 'owned'}
    >
      <Icon className="size-4" />
      {label}
    </Button>
  )
}

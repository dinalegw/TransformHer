'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ShoppingCart, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function PaystackButton({
  bookId,
  inCart: initialInCart,
}: {
  bookId: number
  inCart?: boolean
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [inCart, setInCart] = useState(initialInCart ?? false)

  useEffect(() => {
    setInCart(initialInCart ?? false)
  }, [initialInCart])

  useEffect(() => {
    function onCartUpdate(e: Event) {
      const detail = (e as CustomEvent).detail
      if (detail?.bookId === bookId && detail?.inCart !== undefined) {
        setInCart(detail.inCart)
      }
    }
    window.addEventListener('cart-updated', onCartUpdate)
    return () => window.removeEventListener('cart-updated', onCartUpdate)
  }, [bookId])

  async function handleClick() {
    if (inCart) {
      router.push('/cart')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId }),
      })
      if (res.ok) {
        window.dispatchEvent(new CustomEvent('cart-updated', { detail: { bookId } }))
        router.push('/cart')
      }
    } catch {}
    setLoading(false)
  }

  return (
    <Button
      size="lg"
      className="rounded-full px-8"
      onClick={handleClick}
      disabled={loading}
    >
      {inCart ? <ArrowRight className="size-4" /> : <ShoppingCart className="size-4" />}
      {loading ? 'Processing...' : inCart ? 'View in Cart' : 'Buy & Read Now'}
    </Button>
  )
}

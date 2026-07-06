'use client'

import { useState, useEffect } from 'react'
import { ShoppingCart, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function PaystackButton({
  bookId,
  bookSlug,
  inCart: initialInCart,
}: {
  bookId: number
  bookSlug: string
  inCart?: boolean
}) {
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
      window.location.href = '/cart'
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/paystack/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookSlug }),
      })
      const data = await res.json()
      if (data.status && data.data?.authorization_url) {
        window.location.href = data.data.authorization_url
        return
      }
      console.error('Paystack init failed:', data)
    } catch (err) {
      console.error('Paystack init error:', err)
    }
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
      {loading ? 'Redirecting...' : inCart ? 'View in Cart' : 'Buy & Read Now'}
    </Button>
  )
}

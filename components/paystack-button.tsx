'use client'

import { useState } from 'react'
import { ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function PaystackButton({
  bookSlug,
  bookTitle,
  amount,
  email,
}: {
  bookSlug: string
  bookTitle: string
  amount: number
  email: string
}) {
  const [loading, setLoading] = useState(false)

  async function handlePayment() {
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
      } else {
        console.error('Paystack init failed', data)
        setLoading(false)
      }
    } catch (err) {
      console.error('Payment error', err)
      setLoading(false)
    }
  }

  return (
    <Button
      size="lg"
      className="rounded-full px-8"
      onClick={handlePayment}
      disabled={loading}
    >
      <ShoppingCart className="size-4" />
      {loading ? 'Processing...' : 'Buy & Read Now'}
    </Button>
  )
}

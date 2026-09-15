'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'

export function PurchaseConfirmation({ bookSlug, reference }: { bookSlug: string; reference?: string }) {
  const started = useRef(false)
  const [state, setState] = useState<'loading' | 'success' | 'error'>(reference ? 'loading' : 'error')

  useEffect(() => {
    if (!reference || started.current) return
    started.current = true
    void fetch('/api/paystack/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reference, bookSlug }),
    })
      .then(async response => {
        if (!response.ok) throw new Error('Payment confirmation failed')
        setState('success')
      })
      .catch(() => setState('error'))
  }, [bookSlug, reference])

  if (state === 'loading') {
    return <div className="mb-8 flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-4 text-sm"><Loader2 className="size-4 animate-spin" /> Verifying your payment securely…</div>
  }
  if (state === 'error') {
    return <div className="mb-8 rounded-xl border border-destructive/30 bg-destructive/10 px-5 py-4 text-sm text-destructive">We could not confirm this payment. Please contact support with your payment reference.</div>
  }
  return <div className="mb-8 rounded-xl border border-green-200 bg-green-50 px-5 py-4 text-sm text-green-800">Thank you for your purchase. This book will be unlocked in your library within 72 hours.</div>
}

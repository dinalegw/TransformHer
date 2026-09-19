'use client'

/* eslint-disable react-hooks/set-state-in-effect -- Intentional: initialize state from URL search params */

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const token = searchParams.get('token')
    if (!token) {
      setStatus('error')
      setMessage('No verification token was provided.')
      return
    }

    let cancelled = false

    async function verify() {
      try {
        const response = await fetch('/api/auth/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        })
        const data = await response.json().catch(() => ({}))
        if (cancelled) return

        if (response.ok && data.success) {
          setStatus('success')
          setMessage(data.message || 'Your email has been verified successfully.')
        } else {
          setStatus('error')
          setMessage(data.error || 'Verification failed. Request a new code from your profile after signing in.')
        }
      } catch {
        if (!cancelled) {
          setStatus('error')
          setMessage('Email verification is temporarily unavailable. Please try again.')
        }
      }
    }

    void verify()
    return () => {
      cancelled = true
    }
  }, [searchParams])

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="max-w-md text-center">
          {status === 'verifying' && (
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="size-12 animate-spin text-primary" />
              <p className="text-lg text-muted-foreground">Verifying your email...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="flex flex-col items-center gap-4">
              <CheckCircle2 className="size-16 text-green-500" />
              <h1 className="font-heading text-2xl text-foreground">Email verified</h1>
              <p className="text-muted-foreground">{message}</p>
              <p className="text-sm text-muted-foreground">
                Your verified email is now the identity email for this TransformHer account.
              </p>
              <Button asChild className="mt-4 rounded-full px-8">
                <Link href="/login">Sign in</Link>
              </Button>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center gap-4">
              <XCircle className="size-16 text-destructive" />
              <h1 className="font-heading text-2xl text-foreground">Verification failed</h1>
              <p className="text-muted-foreground">{message}</p>
              <div className="mt-4 flex flex-wrap justify-center gap-3">
                <Button asChild className="rounded-full px-8">
                  <Link href="/login">Sign in</Link>
                </Button>
                <Button asChild variant="outline" className="rounded-full px-8">
                  <Link href="/">Go home</Link>
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-svh items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  )
}

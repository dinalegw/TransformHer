'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const token = searchParams.get('token')
    if (!token) {
      setStatus('error')
      setMessage('No verification token provided.')
      return
    }

    fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setStatus('success')
          setMessage('Your email has been verified successfully!')
        } else {
          setStatus('error')
          setMessage(data.error || 'Verification failed.')
        }
      })
      .catch(() => {
        setStatus('error')
        setMessage('Something went wrong. Please try again.')
      })
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
              <h1 className="font-heading text-2xl text-foreground">Email Verified!</h1>
              <p className="text-muted-foreground">{message}</p>
              <Button asChild className="mt-4 rounded-full px-8">
                <Link href="/library">Go to My Library</Link>
              </Button>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center gap-4">
              <XCircle className="size-16 text-destructive" />
              <h1 className="font-heading text-2xl text-foreground">Verification Failed</h1>
              <p className="text-muted-foreground">{message}</p>
              <Button asChild variant="outline" className="mt-4 rounded-full px-8">
                <Link href="/">Go Home</Link>
              </Button>
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

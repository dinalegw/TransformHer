'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { ArrowLeft, Lock, MailCheck, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'We could not process the reset request. Please try again.')
        setSent(false)
      } else {
        setSent(true)
      }
    } catch {
      setError('We could not process the reset request. Please check your connection and try again.')
      setSent(false)
    } finally {
      setLoading(false)
    }
  }

  function sendAgain() {
    setSent(false)
    setError('')
  }

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm">
          <div className="text-center">
            <Lock className="mx-auto size-8 text-primary" />
            <h1 className="mt-4 font-heading text-3xl text-foreground">Forgot password?</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Enter your email and we&apos;ll send you reset instructions
            </p>
          </div>

          {sent ? (
            <div className="mt-8 space-y-6 text-center">
              <div className="rounded-xl border border-border bg-card p-5">
                <MailCheck className="mx-auto size-9 text-primary" />
                <h2 className="mt-3 text-base font-semibold text-foreground">Reset request received</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  If an account matches <span className="font-medium text-foreground">{email}</span>,
                  password reset instructions will arrive shortly.
                </p>
                <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                  Check your Inbox and Spam/Junk folder. The reset link expires in 1 hour and can only be used once.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <Button type="button" variant="outline" onClick={sendAgain} className="w-full rounded-full">
                  <RotateCcw className="size-4" />
                  Send another reset link
                </Button>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-1.5 text-sm font-medium text-primary hover:underline"
                >
                  <ArrowLeft className="size-4" />
                  Back to sign in
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              {error && (
                <p role="alert" className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error}
                </p>
              )}

              <div>
                <label htmlFor="email" className="text-sm font-medium text-foreground">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  className="mt-1 h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  placeholder="you@example.com"
                />
              </div>

              <Button type="submit" disabled={loading} className="w-full rounded-full">
                {loading ? 'Sending reset instructions...' : 'Send reset link'}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                <Link href="/login" className="font-medium text-primary hover:underline">
                  Back to sign in
                </Link>
              </p>
            </form>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}

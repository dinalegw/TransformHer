'use client'

import { useState, type FormEvent, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { KeyRound, Eye, EyeOff, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'

function ResetPasswordForm() {
  const _router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Something went wrong')
      } else {
        setDone(true)
      }
    } catch {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="flex min-h-svh flex-col">
        <SiteHeader />
        <main className="flex flex-1 items-center justify-center px-4 py-16">
          <div className="w-full max-w-sm text-center">
            <KeyRound className="mx-auto size-8 text-destructive" />
            <h1 className="mt-4 font-heading text-3xl text-foreground">Invalid link</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              This reset link is missing or invalid.
            </p>
            <Link
              href="/forgot-password"
              className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              <ArrowLeft className="size-4" />
              Request a new reset link
            </Link>
          </div>
        </main>
        <SiteFooter />
      </div>
    )
  }

  if (done) {
    return (
      <div className="flex min-h-svh flex-col">
        <SiteHeader />
        <main className="flex flex-1 items-center justify-center px-4 py-16">
          <div className="w-full max-w-sm text-center">
            <KeyRound className="mx-auto size-8 text-primary" />
            <h1 className="mt-4 font-heading text-3xl text-foreground">Password reset</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Your password has been updated successfully.
            </p>
            <Link
              href="/login"
              className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              <ArrowLeft className="size-4" />
              Sign in with your new password
            </Link>
          </div>
        </main>
        <SiteFooter />
      </div>
    )
  }

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm">
          <div className="text-center">
            <KeyRound className="mx-auto size-8 text-primary" />
            <h1 className="mt-4 font-heading text-3xl text-foreground">Set new password</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Enter your new password below
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            {error && (
              <p className="rounded-lg bg-destructive/10 px-4 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            <div>
              <label htmlFor="password" className="text-sm font-medium text-foreground">
                New password
              </label>
              <div className="relative mt-1">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-9 w-full rounded-lg border border-input bg-transparent px-3 pr-10 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  placeholder="At least 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full rounded-full">
              {loading ? 'Resetting...' : 'Reset password'}
            </Button>
          </form>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  )
}

'use client'

import { useState } from 'react'
import { authClient } from '@/lib/auth-client'

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5">
      <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.41Z" />
      <path fill="#34A853" d="M12 22c2.7 0 4.98-.9 6.64-2.44l-3.24-2.54c-.9.6-2.05.96-3.4.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.39 13.85A6 6 0 0 1 6.08 12c0-.64.11-1.27.31-1.85V7.53H3.04A10 10 0 0 0 2 12c0 1.61.38 3.13 1.04 4.47l3.35-2.62Z" />
      <path fill="#EA4335" d="M12 6.02c1.47 0 2.79.51 3.83 1.5l2.88-2.88C16.97 3.02 14.7 2 12 2a10 10 0 0 0-8.96 5.53l3.35 2.62C7.18 7.78 9.39 6.02 12 6.02Z" />
    </svg>
  )
}

export function GoogleSignInButton({
  redirectTo = '/books',
  enabled = true,
}: {
  redirectTo?: string
  enabled?: boolean
}) {
  const [pending, setPending] = useState(false)

  async function signInWithGoogle() {
    if (!enabled || pending) return
    setPending(true)

    const finalRedirect = `/api/auth/google/finalize?redirect=${encodeURIComponent(redirectTo)}`
    const loginError = `/login?error=${encodeURIComponent('Google sign-in could not be completed. Please try again.')}`

    try {
      const { error } = await authClient.signIn.social({
        provider: 'google',
        callbackURL: finalRedirect,
        newUserCallbackURL: finalRedirect,
        errorCallbackURL: loginError,
      })

      if (error) {
        window.location.assign(loginError)
      }
    } catch {
      window.location.assign(loginError)
    } finally {
      setPending(false)
    }
  }

  return (
    <button
      type="button"
      onClick={signInWithGoogle}
      disabled={!enabled || pending}
      className="inline-flex h-11 w-full items-center justify-center gap-3 rounded-lg border border-input bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <GoogleMark />
      {pending
        ? 'Connecting to Google…'
        : enabled
          ? 'Continue with Google'
          : 'Google sign-in setup pending'}
    </button>
  )
}

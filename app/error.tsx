'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Page error:', error)
  }, [error])

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="space-y-2">
        <h1 className="font-heading text-6xl text-foreground">500</h1>
        <h2 className="font-heading text-xl text-foreground">Something went wrong</h2>
        <p className="max-w-sm text-muted-foreground">
          An unexpected error occurred. Please try again or contact support if the problem persists.
        </p>
      </div>
      <div className="flex gap-4">
        <Button onClick={reset} className="rounded-full px-6">
          Try again
        </Button>
        <Button asChild variant="outline" className="rounded-full px-6">
          <Link href="/">Go home</Link>
        </Button>
      </div>
    </div>
  )
}

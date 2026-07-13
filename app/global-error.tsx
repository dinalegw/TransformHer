'use client'

import { useEffect } from 'react'

export default function GlobalErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Fatal error:', error)
  }, [error])

  return (
    <html lang="en">
      <body className="flex min-h-svh flex-col items-center justify-center gap-6 px-4 text-center font-sans antialiased">
        <div className="space-y-2">
          <h1 className="text-6xl font-bold text-foreground">500</h1>
          <h2 className="text-xl font-semibold text-foreground">Critical error</h2>
          <p className="max-w-sm text-muted-foreground">
            A critical error occurred. Please refresh the page or try again later.
          </p>
        </div>
        <div className="flex gap-4">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Try again
          </button>
          <button
            onClick={() => { window.location.href = '/' }}
            className="inline-flex items-center justify-center rounded-full border border-border bg-card px-6 py-2 text-sm font-medium text-foreground hover:bg-secondary"
          >
            Go home
          </button>
        </div>
      </body>
    </html>
  )
}

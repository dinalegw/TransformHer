import type { ReactNode } from 'react'
import Link from 'next/link'

export function LegalPage({
  title,
  lastUpdated,
  children,
}: {
  title: string
  lastUpdated: string
  children: ReactNode
}) {
  return (
    <main className="mx-auto min-h-screen max-w-4xl px-4 py-12 md:px-6 md:py-16">
      <Link href="/" className="text-sm text-primary hover:underline">
        ← Back to TransformHer
      </Link>
      <div className="mt-6">
        <p className="text-xs uppercase tracking-luxe text-primary">TransformHer</p>
        <h1 className="mt-2 font-heading text-4xl text-foreground md:text-5xl">
          {title}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Last updated: {lastUpdated}
        </p>
      </div>
      <div className="prose prose-neutral mt-10 max-w-none dark:prose-invert [&_h2]:font-heading [&_h2]:text-2xl [&_h2]:text-foreground [&_p]:text-muted-foreground [&_li]:text-muted-foreground">
        {children}
      </div>
    </main>
  )
}

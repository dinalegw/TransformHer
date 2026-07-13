import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFoundPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="space-y-2">
        <h1 className="font-heading text-6xl text-foreground">404</h1>
        <h2 className="font-heading text-xl text-foreground">Page not found</h2>
        <p className="max-w-sm text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
      </div>
      <div className="flex gap-4">
        <Button asChild className="rounded-full px-6">
          <Link href="/">Go home</Link>
        </Button>
        <Button asChild variant="outline" className="rounded-full px-6">
          <Link href="/books">Browse library</Link>
        </Button>
      </div>
    </div>
  )
}

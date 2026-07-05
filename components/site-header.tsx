'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { AuthButtons } from '@/components/auth-buttons'

const NAV = [
  { href: '/', label: 'Home' },
  { href: '/books', label: 'The Library' },
  { href: '/books#categories', label: 'Categories' },
  { href: '/#about', label: 'About' },
]

export function SiteHeader() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [user, setUser] = useState<{ id: string; name: string; email: string; isAdmin: boolean } | null | 'loading'>('loading')
  const isLoggedIn = user !== null && user !== 'loading'

  useEffect(() => {
    let cancelled = false
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data) => { if (!cancelled) setUser(data.user) })
      .catch(() => { if (!cancelled) setUser(null) })
    return () => { cancelled = true }
  }, [])

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-6">
        <Link href="/" className="font-heading text-xl tracking-tight text-foreground md:text-2xl">
          Bookstore
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                'text-sm tracking-wide text-muted-foreground transition-colors hover:text-foreground',
                pathname === item.href && 'text-foreground',
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-4 md:flex">
          <AuthButtons user={user} />
        </div>

        <button
          type="button"
          className="md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          {open ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-border/60 bg-background md:hidden">
          <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-4">
            {NAV.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-2 flex gap-2">
              {isLoggedIn ? (
                <>
                  <span className="flex-1 rounded-md px-2 py-2 text-sm text-muted-foreground">
                    {user!.name}
                  </span>
                  <Button asChild variant="ghost" size="sm" className="rounded-full">
                    <Link href="/api/auth/logout" onClick={(e) => { e.preventDefault(); fetch('/api/auth/logout', { method: 'POST' }).then(() => { setOpen(false); window.location.href = '/' }) }}>
                      Sign out
                    </Link>
                  </Button>
                </>
              ) : (
                <>
                  <Button asChild variant="ghost" size="sm" className="flex-1 rounded-full">
                    <Link href="/login" onClick={() => setOpen(false)}>Sign in</Link>
                  </Button>
                  <Button asChild size="sm" className="flex-1 rounded-full">
                    <Link href="/signup" onClick={() => setOpen(false)}>Sign up</Link>
                  </Button>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}

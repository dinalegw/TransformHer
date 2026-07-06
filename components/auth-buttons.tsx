'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { LogOut, User, Settings, BookOpen, ShoppingCart, UserCog } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState } from 'react'

interface AuthUser {
  id: string
  name: string
  email: string
  isAdmin: boolean
}

export function AuthButtons({ user }: { user: AuthUser | null | 'loading' }) {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    setMenuOpen(false)
    router.push('/')
    router.refresh()
  }

  if (user === 'loading') {
    return <div className="h-9 w-24 rounded-full bg-secondary/50 animate-pulse" />
  }

  if (user) {
    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm transition-colors hover:border-primary"
        >
          <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
            {user.name.charAt(0).toUpperCase()}
          </span>
          <span className="hidden sm:inline text-muted-foreground">{user.name}</span>
        </button>
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-xl border border-border bg-card shadow-xl">
              <div className="border-b border-border px-4 py-3">
                <p className="text-sm font-medium text-foreground">{user.name}</p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
              <div className="p-1.5">
                <Link
                  href="/library"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  <BookOpen className="size-4" />
                  My Library
                </Link>
                <Link
                  href="/cart"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  <ShoppingCart className="size-4" />
                  Cart
                </Link>
                <Link
                  href="/profile"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  <UserCog className="size-4" />
                  Profile
                </Link>
                {user.isAdmin && (
                  <Link
                    href="/admin"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  >
                    <Settings className="size-4" />
                    Admin
                  </Link>
                )}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  <LogOut className="size-4" />
                  Sign out
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <Button asChild variant="ghost" size="sm" className="rounded-full">
        <Link href="/login">Sign in</Link>
      </Button>
      <Button asChild size="sm" className="rounded-full">
        <Link href="/signup">Sign up</Link>
      </Button>
    </div>
  )
}

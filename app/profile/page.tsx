'use client'

import { useState, useEffect, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { User, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'

export default function ProfilePage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [phone, setPhone] = useState('')
  const [showFullName, setShowFullName] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then((data) => {
        if (!data.user) {
          router.push('/login')
          return
        }
        setName(data.user.name || '')
        setEmail(data.user.email || '')
        setUsername(data.user.username || '')
        setPhone(data.user.phone || '')
        setShowFullName(data.user.showFullName ?? false)
      })
      .catch(() => router.push('/login'))
      .finally(() => setFetching(false))
  }, [router])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, username, phone, showFullName }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Update failed')
      } else {
        setSuccess('Profile updated')
      }
    } catch {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (fetching) {
    return (
      <div className="flex min-h-svh flex-col">
        <SiteHeader />
        <main className="flex flex-1 items-center justify-center px-4 py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </main>
        <SiteFooter />
      </div>
    )
  }

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="flex-1">
        <section className="border-b border-border/60 bg-secondary/40">
          <div className="mx-auto max-w-6xl px-4 py-10 md:px-6">
            <p className="text-xs uppercase tracking-luxe text-primary">Account</p>
            <h1 className="mt-2 font-heading text-3xl text-foreground md:text-4xl">
              Profile Settings
            </h1>
          </div>
        </section>

        <section className="mx-auto max-w-2xl px-4 py-10 md:px-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <p className="rounded-lg bg-destructive/10 px-4 py-2 text-sm text-destructive">{error}</p>
            )}
            {success && (
              <p className="rounded-lg bg-green-50 px-4 py-2 text-sm text-green-700">{success}</p>
            )}

            <div>
              <label htmlFor="name" className="text-sm font-medium text-foreground">Full name</label>
              <input
                id="name"
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                className="mt-1 h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </div>

            <div>
              <label htmlFor="email" className="text-sm font-medium text-foreground">Email</label>
              <input
                id="email"
                type="email"
                disabled
                value={email}
                className="mt-1 h-9 w-full rounded-lg border border-input bg-muted px-3 text-sm text-muted-foreground outline-none"
              />
              <p className="mt-1 text-xs text-muted-foreground">Email cannot be changed</p>
            </div>

            <div>
              <label htmlFor="username" className="text-sm font-medium text-foreground">Username</label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="mt-1 h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                placeholder="Optional"
              />
            </div>

            <div>
              <label htmlFor="phone" className="text-sm font-medium text-foreground">Phone</label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="mt-1 h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                placeholder="Optional"
              />
            </div>

            <div className="flex items-center gap-3">
              <input
                id="showFullName"
                type="checkbox"
                checked={showFullName}
                onChange={e => setShowFullName(e.target.checked)}
                className="size-4 rounded border-input accent-primary"
              />
              <label htmlFor="showFullName" className="text-sm text-muted-foreground">
                Show my full name instead of username
              </label>
            </div>

            <Button type="submit" disabled={loading} className="rounded-full">
              <Save className="size-4" />
              {loading ? 'Saving...' : 'Save changes'}
            </Button>
          </form>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}

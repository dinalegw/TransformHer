'use client'

import { useState, useEffect, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Save, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'

export default function ProfilePage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('user')
  const [username, setUsername] = useState('')
  const [phone, setPhone] = useState('')
  const [showFullName, setShowFullName] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [accountLoaded, setAccountLoaded] = useState(false)

  const [deletePassword, setDeletePassword] = useState('')
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadProfile() {
      try {
        const res = await fetch('/api/auth/me', { cache: 'no-store' })
        const data = await res.json().catch(() => ({}))
        if (cancelled) return

        if (res.status === 401 || (res.ok && !data.user)) {
          router.push('/login')
          return
        }

        if (!res.ok) {
          setError(data.error || 'Account service is temporarily unavailable. Please try again.')
          return
        }

        setName(data.user.name || '')
        setEmail(data.user.email || '')
        setRole(data.user.role || 'user')
        setUsername(data.user.username || '')
        setPhone(data.user.phone || '')
        setShowFullName(data.user.showFullName ?? false)
        setAccountLoaded(true)
      } catch {
        if (!cancelled) {
          setError('Account service is temporarily unavailable. Please try again.')
        }
      } finally {
        if (!cancelled) setFetching(false)
      }
    }

    void loadProfile()
    return () => {
      cancelled = true
    }
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
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || 'Update failed')
      } else {
        setSuccess('Profile updated')
      }
    } catch {
      setError('Unable to update your profile right now.')
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteAccount() {
    setDeleteError('')
    if (deleteConfirmation !== 'DELETE') {
      setDeleteError('Type DELETE exactly to confirm account deletion.')
      return
    }
    if (!deletePassword) {
      setDeleteError('Enter your current password.')
      return
    }
    if (!window.confirm('Delete your TransformHer account permanently? This cannot be undone.')) return

    setDeleting(true)
    try {
      const res = await fetch('/api/account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirm: deleteConfirmation,
          password: deletePassword,
          reason: 'User requested account deletion from profile settings',
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setDeleteError(data.error || 'Unable to delete account')
        return
      }
      window.location.href = '/'
    } catch {
      setDeleteError('Unable to delete your account right now.')
    } finally {
      setDeleting(false)
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

  if (!accountLoaded) {
    return (
      <div className="flex min-h-svh flex-col">
        <SiteHeader />
        <main className="flex flex-1 items-center justify-center px-4 py-16">
          <div className="max-w-md rounded-xl border border-border bg-card p-6 text-center shadow-sm">
            <h1 className="font-heading text-2xl text-foreground">Account temporarily unavailable</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {error || 'We could not load your account right now. Your session has not been discarded.'}
            </p>
            <Button className="mt-5 rounded-full" onClick={() => window.location.reload()}>
              Try again
            </Button>
          </div>
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
            <h1 className="mt-2 font-heading text-3xl text-foreground md:text-4xl">Profile Settings</h1>
          </div>
        </section>

        <section className="mx-auto max-w-2xl px-4 py-10 md:px-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && <p className="rounded-lg bg-destructive/10 px-4 py-2 text-sm text-destructive">{error}</p>}
            {success && <p className="rounded-lg bg-green-50 px-4 py-2 text-sm text-green-700">{success}</p>}

            <div>
              <Label htmlFor="name">Full name</Label>
              <Input id="name" type="text" required value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" disabled value={email} className="mt-1" />
              <p className="mt-1 text-xs text-muted-foreground">Email cannot be changed</p>
            </div>

            <div>
              <Label htmlFor="username">Username</Label>
              <Input id="username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="mt-1" placeholder="Optional" />
            </div>

            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1" placeholder="Optional" />
            </div>

            <div className="flex items-center gap-3">
              <input id="showFullName" type="checkbox" checked={showFullName} onChange={(e) => setShowFullName(e.target.checked)} className="size-4 rounded border-input accent-primary" />
              <Label htmlFor="showFullName" className="font-normal">Show my full name instead of username</Label>
            </div>

            <Button type="submit" disabled={loading} className="rounded-full">
              <Save className="size-4" />
              {loading ? 'Saving...' : 'Save changes'}
            </Button>
          </form>

          <div className="my-10 border-t border-border" />

          <section className="rounded-xl border border-destructive/30 bg-destructive/5 p-5">
            <div className="flex items-start gap-3">
              <Trash2 className="mt-0.5 size-5 shrink-0 text-destructive" />
              <div className="flex-1">
                <h2 className="font-heading text-xl text-foreground">Danger Zone</h2>
                {role === 'master_admin' ? (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Master Admin accounts cannot be self-deleted. Use the controlled administrative recovery process instead.
                  </p>
                ) : (
                  <>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Deleting your account permanently removes the active account and signs you out. Limited records may be retained only for fraud prevention, payment disputes, accounting, security, legal claims, or lawful requests under the retention policy.
                    </p>

                    {deleteError && (
                      <p className="mt-4 rounded-lg bg-destructive/10 px-4 py-2 text-sm text-destructive">{deleteError}</p>
                    )}

                    <div className="mt-5 space-y-4">
                      <div>
                        <Label htmlFor="delete-password">Current password</Label>
                        <Input id="delete-password" type="password" autoComplete="current-password" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} className="mt-1" />
                      </div>
                      <div>
                        <Label htmlFor="delete-confirmation">Type DELETE to confirm</Label>
                        <Input id="delete-confirmation" value={deleteConfirmation} onChange={(e) => setDeleteConfirmation(e.target.value)} className="mt-1" placeholder="DELETE" />
                      </div>
                      <Button type="button" variant="destructive" disabled={deleting || deleteConfirmation !== 'DELETE' || !deletePassword} onClick={handleDeleteAccount}>
                        <Trash2 className="size-4" />
                        {deleting ? 'Deleting account...' : 'Delete my account'}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </section>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}

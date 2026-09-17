'use client'

import { useState, useEffect, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { BadgeCheck, Loader2, MailCheck, Save, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'

export default function ProfilePage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [emailVerified, setEmailVerified] = useState(false)
  const [role, setRole] = useState('user')
  const [username, setUsername] = useState('')
  const [phone, setPhone] = useState('')
  const [showFullName, setShowFullName] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [accountLoaded, setAccountLoaded] = useState(false)

  const [verificationRequested, setVerificationRequested] = useState(false)
  const [verificationCode, setVerificationCode] = useState('')
  const [verificationLoading, setVerificationLoading] = useState(false)
  const [verificationError, setVerificationError] = useState('')
  const [verificationNotice, setVerificationNotice] = useState('')

  const [deleteReason, setDeleteReason] = useState('')
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
        setEmailVerified(Boolean(data.user.emailVerified))
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

  async function requestVerificationCode() {
    setVerificationLoading(true)
    setVerificationError('')
    setVerificationNotice('')
    try {
      const res = await fetch('/api/auth/email-verification-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setVerificationError(data.error || 'Unable to send a verification code.')
        return
      }
      if (data.verified) {
        setEmailVerified(true)
        setVerificationRequested(false)
        setVerificationNotice('Your email is already verified and locked to this account.')
        return
      }
      setVerificationRequested(true)
      setVerificationNotice(data.message || 'A verification code was sent to your email.')
    } catch {
      setVerificationError('Unable to send a verification code right now.')
    } finally {
      setVerificationLoading(false)
    }
  }

  async function confirmVerificationCode() {
    setVerificationLoading(true)
    setVerificationError('')
    setVerificationNotice('')
    try {
      const res = await fetch('/api/auth/email-verification-code', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: verificationCode }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setVerificationError(data.error || 'Unable to verify that code.')
        return
      }
      setEmailVerified(true)
      setVerificationRequested(false)
      setVerificationCode('')
      setVerificationNotice(data.message || 'Your email has been verified successfully.')
    } catch {
      setVerificationError('Unable to verify your email right now.')
    } finally {
      setVerificationLoading(false)
    }
  }

  async function handleDeleteAccount() {
    setDeleteError('')
    const reason = deleteReason.trim()

    if (reason.length < 5) {
      setDeleteError('Please tell us why you want to delete your account.')
      return
    }
    if (reason.length > 500) {
      setDeleteError('Deletion reason must be 500 characters or fewer.')
      return
    }
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
          reason,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setDeleteError(data.error || 'Unable to delete account')
        return
      }
      window.location.href = '/?accountDeleted=1'
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

            <section className="rounded-xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" disabled value={email} className="mt-1" />
                </div>
                <span className={`mt-6 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${emailVerified ? 'border-green-300 bg-green-50 text-green-700' : 'border-amber-300 bg-amber-50 text-amber-800'}`}>
                  {emailVerified ? <BadgeCheck className="size-3.5" /> : <MailCheck className="size-3.5" />}
                  {emailVerified ? 'Verified & locked' : 'Not verified'}
                </span>
              </div>

              {emailVerified ? (
                <p className="mt-3 text-xs text-muted-foreground">
                  This verified email is locked to your TransformHer account and cannot be changed from profile settings.
                </p>
              ) : (
                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50/60 p-4">
                  <p className="text-sm text-foreground">
                    Verify this email to secure your account. We will send a unique 6-digit code to <strong>{email}</strong>.
                  </p>

                  {verificationError && (
                    <p className="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{verificationError}</p>
                  )}
                  {verificationNotice && (
                    <p className="mt-3 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">{verificationNotice}</p>
                  )}

                  {!verificationRequested ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="mt-4 rounded-full"
                      disabled={verificationLoading}
                      onClick={requestVerificationCode}
                    >
                      {verificationLoading ? <Loader2 className="size-4 animate-spin" /> : <MailCheck className="size-4" />}
                      {verificationLoading ? 'Sending code...' : 'Verify email'}
                    </Button>
                  ) : (
                    <div className="mt-4 space-y-3">
                      <div>
                        <Label htmlFor="verification-code">6-digit verification code</Label>
                        <Input
                          id="verification-code"
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          maxLength={6}
                          value={verificationCode}
                          onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          className="mt-1 max-w-52 text-center font-mono text-lg tracking-[0.35em]"
                          placeholder="000000"
                        />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          className="rounded-full"
                          disabled={verificationLoading || verificationCode.length !== 6}
                          onClick={confirmVerificationCode}
                        >
                          {verificationLoading && <Loader2 className="size-4 animate-spin" />}
                          Confirm code
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          className="rounded-full"
                          disabled={verificationLoading}
                          onClick={requestVerificationCode}
                        >
                          Resend code
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        The code expires after 10 minutes. For security, too many incorrect attempts require a new code.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </section>

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
                      Deleting your account permanently removes the active account and signs you out. Limited records may be retained only for fraud prevention, payment disputes, accounting, security, legal claims, or lawful requests under the retention policy. Your deletion reason is stored with that restricted archive so the Master Admin can understand why the account was closed.
                    </p>

                    {deleteError && (
                      <p className="mt-4 rounded-lg bg-destructive/10 px-4 py-2 text-sm text-destructive">{deleteError}</p>
                    )}

                    <div className="mt-5 space-y-4">
                      <div>
                        <Label htmlFor="delete-reason">Why are you deleting your account?</Label>
                        <textarea
                          id="delete-reason"
                          required
                          minLength={5}
                          maxLength={500}
                          value={deleteReason}
                          onChange={(e) => setDeleteReason(e.target.value)}
                          className="mt-1 min-h-28 w-full resize-y rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                          placeholder="For example: I no longer need the service."
                        />
                        <p className="mt-1 text-xs text-muted-foreground">{deleteReason.length}/500 characters</p>
                      </div>
                      <div>
                        <Label htmlFor="delete-password">Current password</Label>
                        <Input id="delete-password" type="password" autoComplete="current-password" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} className="mt-1" />
                      </div>
                      <div>
                        <Label htmlFor="delete-confirmation">Type DELETE to confirm</Label>
                        <Input id="delete-confirmation" value={deleteConfirmation} onChange={(e) => setDeleteConfirmation(e.target.value)} className="mt-1" placeholder="DELETE" />
                      </div>
                      <Button
                        type="button"
                        variant="destructive"
                        disabled={deleting || deleteReason.trim().length < 5 || deleteConfirmation !== 'DELETE' || !deletePassword}
                        onClick={handleDeleteAccount}
                      >
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

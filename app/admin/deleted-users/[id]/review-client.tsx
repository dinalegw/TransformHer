'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2, ShieldAlert, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface PurchaseSnapshot {
  bookId?: number
  bookSlug?: string
  purchaseDate?: string
  paymentReference?: string | null
  released?: boolean
  releaseAt?: string | null
}

interface ArchiveRecord {
  id: string
  originalUserId: string
  originalEmail: string
  originalName: string
  username?: string | null
  phone?: string | null
  accountCreatedAt?: string | null
  accountDeletedAt: string
  deletionType: string
  deletedBy?: string | null
  deletionReason?: string | null
  accountStatusAtDeletion?: string | null
  emailVerified: boolean
  purchaseSnapshot: PurchaseSnapshot[]
  retentionReason: string
  retentionExpiresAt: string
  legalHold: boolean
  legalHoldReference?: string | null
  createdAt: string
}

function formatDate(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString()
}

export function DeletedUserReviewClient({ archiveId }: { archiveId: string }) {
  const [reason, setReason] = useState('')
  const [reference, setReference] = useState('')
  const [archive, setArchive] = useState<ArchiveRecord | null>(null)
  const [loading, setLoading] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function reviewRecord() {
    const trimmedReason = reason.trim()
    if (trimmedReason.length < 5) {
      setError('Enter a documented review reason of at least 5 characters.')
      return
    }

    setLoading(true)
    setError('')
    setNotice('')
    try {
      const params = new URLSearchParams({ reason: trimmedReason })
      if (reference.trim()) params.set('reference', reference.trim())

      const res = await fetch(`/api/admin/deleted-users/${encodeURIComponent(archiveId)}?${params.toString()}`, {
        method: 'GET',
        cache: 'no-store',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Unable to load retained details.')
      setArchive(data.archive as ArchiveRecord)
      setNotice('Access recorded in the compliance audit trail.')
    } catch (err) {
      setArchive(null)
      setError(err instanceof Error ? err.message : 'Unable to load retained details.')
    } finally {
      setLoading(false)
    }
  }

  async function updateHold(enabled: boolean) {
    const trimmedReason = reason.trim()
    const trimmedReference = reference.trim()

    if (trimmedReason.length < 5) {
      setError('Enter a documented reason before changing legal-hold status.')
      return
    }
    if (enabled && !trimmedReference) {
      setError('Enter the lawful request or case reference before placing a legal hold.')
      return
    }

    setUpdating(true)
    setError('')
    setNotice('')
    try {
      const res = await fetch(`/api/admin/deleted-users/${encodeURIComponent(archiveId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: enabled ? 'legal_hold' : 'release_hold',
          reason: trimmedReason,
          reference: trimmedReference || undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Unable to update legal hold.')

      setArchive((current) => current
        ? {
            ...current,
            legalHold: enabled,
            legalHoldReference: enabled ? trimmedReference : null,
          }
        : current)
      setNotice(enabled
        ? 'Legal hold placed and audited.'
        : 'Legal hold released and audited.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update legal hold.')
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div className="mt-6 space-y-6">
      <Link
        href="/admin/deleted-users"
        className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
      >
        <ArrowLeft className="size-4" />
        Back to deleted accounts
      </Link>

      <section className="rounded-xl border bg-card p-5">
        <h2 className="font-semibold">Documented access purpose</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          A reason is required before retained personal or purchase information is disclosed.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="reason" className="mb-1.5 block text-sm font-medium">Reason</label>
            <Input
              id="reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="e.g. Payment dispute investigation"
              maxLength={500}
            />
          </div>
          <div>
            <label htmlFor="reference" className="mb-1.5 block text-sm font-medium">
              Case / lawful request reference
            </label>
            <Input
              id="reference"
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              placeholder="Optional for review; required for legal hold"
              maxLength={200}
            />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button onClick={reviewRecord} disabled={loading}>
            {loading && <Loader2 className="size-4 animate-spin" />}
            Review retained record
          </Button>
          {archive && !archive.legalHold && (
            <Button variant="outline" onClick={() => updateHold(true)} disabled={updating}>
              {updating ? <Loader2 className="size-4 animate-spin" /> : <ShieldAlert className="size-4" />}
              Place legal hold
            </Button>
          )}
          {archive?.legalHold && (
            <Button variant="outline" onClick={() => updateHold(false)} disabled={updating}>
              {updating ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
              Release legal hold
            </Button>
          )}
        </div>
        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        {notice && <p className="mt-3 text-sm text-muted-foreground">{notice}</p>}
      </section>

      {archive && (
        <>
          <section className="rounded-xl border bg-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">{archive.originalName}</h2>
                <p className="text-sm text-muted-foreground">{archive.originalEmail}</p>
              </div>
              <span className="rounded-full border px-3 py-1 text-xs font-medium">
                {archive.legalHold ? 'Legal hold active' : 'No legal hold'}
              </span>
            </div>

            <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
              <div><dt className="text-muted-foreground">Original user ID</dt><dd className="break-all font-medium">{archive.originalUserId}</dd></div>
              <div><dt className="text-muted-foreground">Username</dt><dd className="font-medium">{archive.username || '—'}</dd></div>
              <div><dt className="text-muted-foreground">Phone</dt><dd className="font-medium">{archive.phone || '—'}</dd></div>
              <div><dt className="text-muted-foreground">Email verified</dt><dd className="font-medium">{archive.emailVerified ? 'Yes' : 'No'}</dd></div>
              <div><dt className="text-muted-foreground">Account created</dt><dd className="font-medium">{formatDate(archive.accountCreatedAt)}</dd></div>
              <div><dt className="text-muted-foreground">Account deleted</dt><dd className="font-medium">{formatDate(archive.accountDeletedAt)}</dd></div>
              <div><dt className="text-muted-foreground">Deletion method</dt><dd className="font-medium">{archive.deletionType}</dd></div>
              <div><dt className="text-muted-foreground">Status at deletion</dt><dd className="font-medium">{archive.accountStatusAtDeletion || '—'}</dd></div>
              <div className="sm:col-span-2"><dt className="text-muted-foreground">Deletion reason</dt><dd className="font-medium">{archive.deletionReason || '—'}</dd></div>
              <div className="sm:col-span-2"><dt className="text-muted-foreground">Retention purpose</dt><dd className="font-medium">{archive.retentionReason}</dd></div>
              <div><dt className="text-muted-foreground">Retention expiry</dt><dd className="font-medium">{formatDate(archive.retentionExpiresAt)}</dd></div>
              <div><dt className="text-muted-foreground">Legal-hold reference</dt><dd className="font-medium">{archive.legalHoldReference || '—'}</dd></div>
            </dl>
          </section>

          <section className="rounded-xl border bg-card p-5">
            <h2 className="text-xl font-semibold">Retained purchase references</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Limited transaction evidence only. Payment credentials and authentication secrets are not retained here.
            </p>

            {archive.purchaseSnapshot.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">No retained purchase references.</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr>
                      <th className="p-2">Book</th>
                      <th className="p-2">Purchased</th>
                      <th className="p-2">Payment reference</th>
                      <th className="p-2">Released</th>
                    </tr>
                  </thead>
                  <tbody>
                    {archive.purchaseSnapshot.map((purchase, index) => (
                      <tr key={`${purchase.paymentReference || purchase.bookSlug || purchase.bookId || 'purchase'}-${index}`} className="border-t">
                        <td className="p-2">{purchase.bookSlug || purchase.bookId || '—'}</td>
                        <td className="p-2">{formatDate(purchase.purchaseDate)}</td>
                        <td className="p-2 break-all">{purchase.paymentReference || '—'}</td>
                        <td className="p-2">{purchase.released ? 'Yes' : 'No'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Check, X, Loader2, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PendingChange {
  id: string
  bookSlug: string
  bookTitle: string
  type: 'create' | 'update' | 'delete' | 'archive'
  submittedByEmail: string
  submittedAt: string
  status: string
  changes?: Record<string, unknown>
}

export function AdminPendingChanges() {
  const router = useRouter()
  const [pending, setPending] = useState<PendingChange[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  const fetchPending = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/notifications')
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setPending(data.pending || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load pending changes')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPending()
  }, [fetchPending])

  const handleApprove = useCallback(async (changeId: string) => {
    setActionLoading(changeId)
    setError('')
    try {
      const res = await fetch(`/api/admin/books/${changeId}/approve`, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to approve')
      }
      await fetchPending()
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setActionLoading(null)
    }
  }, [fetchPending, router])

  const handleReject = useCallback(async (changeId: string) => {
    setActionLoading(changeId)
    setError('')
    try {
      const res = await fetch(`/api/admin/books/${changeId}/reject`, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to reject')
      }
      await fetchPending()
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setActionLoading(null)
    }
  }, [fetchPending, router])

  const typeLabel = (type: string) => {
    const map: Record<string, { label: string; color: string }> = {
      create: { label: 'Create', color: 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400' },
      update: { label: 'Update', color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400' },
      delete: { label: 'Delete', color: 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400' },
      archive: { label: 'Archive', color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400' },
    }
    return map[type] || { label: type, color: 'text-muted-foreground bg-muted' }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div>
      {error && (
        <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {pending.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <Clock className="size-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No pending changes to review</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pending.map((change) => {
            const info = typeLabel(change.type)
            return (
              <div
                key={change.id}
                className="rounded-xl border border-border p-4 transition-colors hover:bg-muted/30"
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${info.color}`}>
                        {info.label}
                      </span>
                      <h3 className="truncate text-sm font-medium text-foreground">
                        {change.bookTitle}
                      </h3>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      by {change.submittedByEmail}
                    </p>
                    <p className="text-[10px] text-muted-foreground/60">
                      {new Date(change.submittedAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="ml-3 flex shrink-0 gap-1">
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => handleApprove(change.id)}
                      disabled={actionLoading === change.id}
                      className="text-green-600 hover:text-green-700 hover:bg-green-100 dark:hover:bg-green-900/30"
                      aria-label="Approve"
                    >
                      {actionLoading === change.id ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Check className="size-3.5" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => handleReject(change.id)}
                      disabled={actionLoading === change.id}
                      className="text-destructive hover:text-destructive"
                      aria-label="Reject"
                    >
                      <X className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

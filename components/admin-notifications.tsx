'use client'

/* eslint-disable react-hooks/set-state-in-effect -- Intentional: poll for pending changes */

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, Check, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PendingChange {
  id: string
  bookSlug: string
  bookTitle: string
  type: 'create' | 'update' | 'delete' | 'archive'
  submittedBy: string
  submittedByEmail: string
  submittedAt: string
  status: string
}

export function AdminNotifications() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState<PendingChange[]>([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchPending = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/notifications')
      if (!res.ok) return
      const data = await res.json()
      setPending(data.pending || [])
      setCount(data.total || 0)
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPending()
    const interval = setInterval(fetchPending, 30000)
    return () => clearInterval(interval)
  }, [fetchPending])

  const handleApprove = useCallback(async (changeId: string) => {
    setActionLoading(changeId)
    try {
      await fetch(`/api/admin/books/${changeId}/approve`, { method: 'POST' })
      await fetchPending()
      router.refresh()
    } catch {
      // silently fail
    } finally {
      setActionLoading(null)
    }
  }, [fetchPending, router])

  const handleReject = useCallback(async (changeId: string) => {
    setActionLoading(changeId)
    try {
      await fetch(`/api/admin/books/${changeId}/reject`, { method: 'POST' })
      await fetchPending()
      router.refresh()
    } catch {
      // silently fail
    } finally {
      setActionLoading(null)
    }
  }, [fetchPending, router])

  const typeLabel = (type: string) => {
    const map: Record<string, string> = {
      create: 'Create',
      update: 'Update',
      delete: 'Delete',
      archive: 'Archive',
    }
    return map[type] || type
  }

  if (loading) return null
  if (count === 0) return null

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        aria-label={`${count} pending ${count === 1 ? 'change' : 'changes'}`}
      >
        <Bell className="size-4" />
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border border-border bg-card shadow-xl">
            <div className="border-b border-border px-4 py-3">
              <p className="text-sm font-medium text-foreground">
                Pending Changes ({count})
              </p>
            </div>
            <div className="max-h-80 overflow-y-auto p-1.5">
              {pending.length === 0 ? (
                <p className="px-3 py-4 text-center text-sm text-muted-foreground">
                  No pending changes
                </p>
              ) : (
                pending.map((change) => (
                  <div
                    key={change.id}
                    className="rounded-lg p-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">
                          {change.bookTitle}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {typeLabel(change.type)} by {change.submittedByEmail}
                        </p>
                        <p className="text-[10px] text-muted-foreground/60">
                          {new Date(change.submittedAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="ml-2 flex shrink-0 gap-1">
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => handleApprove(change.id)}
                          disabled={actionLoading === change.id}
                          className="text-green-600 hover:text-green-700"
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
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

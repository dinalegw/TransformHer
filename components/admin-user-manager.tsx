'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Shield, ShieldOff, UserCog, Star, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface StoredUser {
  id: string
  name: string
  email: string
  isAdmin: boolean
  role: string
  rank?: string
  title?: string
  username?: string
}

const ADMIN_RANKS = [
  { value: 'junior', label: 'Junior Admin' },
  { value: 'senior', label: 'Senior Admin' },
  { value: 'lead', label: 'Lead Admin' },
  { value: 'master', label: 'Master Admin' },
] as const

export function AdminUserManager() {
  const router = useRouter()
  const [users, setUsers] = useState<StoredUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updating, setUpdating] = useState<string | null>(null)

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/users')
      if (!res.ok) throw new Error('Failed to fetch users')
      const data = await res.json()
      setUsers(data.users || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const toggleAdmin = useCallback(async (user: StoredUser) => {
    if (user.role === 'master_admin') return

    setUpdating(user.id)
    setError('')

    try {
      const newRole = user.isAdmin ? 'user' : 'admin'
      const newRank = user.isAdmin ? undefined : 'junior'

      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole, rank: newRank }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update user')
      }

      await fetchUsers()
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setUpdating(null)
    }
  }, [fetchUsers, router])

  const updateRank = useCallback(async (userId: string, rank: string) => {
    setUpdating(userId)
    setError('')

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rank }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update rank')
      }

      await fetchUsers()
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setUpdating(null)
    }
  }, [fetchUsers, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const adminUsers = users.filter(u => u.isAdmin)
  const regularUsers = users.filter(u => !u.isAdmin)

  return (
    <div>
      {error && (
        <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {adminUsers.length > 0 && (
        <div className="mb-8">
          <h3 className="mb-3 text-sm font-medium text-muted-foreground">
            Administrators ({adminUsers.length})
          </h3>
          <div className="space-y-2">
            {adminUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between rounded-lg border border-border p-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Shield className="size-4 text-primary" />
                    <span className="text-sm font-medium text-foreground">
                      {user.name || user.email}
                    </span>
                    {user.role === 'master_admin' && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                        <Star className="size-3" />
                        Master
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{user.email}</p>
                  {user.rank && user.role !== 'master_admin' && (
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground/60">Rank:</span>
                      <select
                        value={user.rank}
                        onChange={(e) => updateRank(user.id, e.target.value)}
                        disabled={updating === user.id}
                        className="h-6 rounded border border-input bg-transparent px-1.5 text-[11px] outline-none focus-visible:border-ring"
                      >
                        {ADMIN_RANKS.map((r) => (
                          <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
                {user.role !== 'master_admin' && (
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => toggleAdmin(user)}
                    disabled={updating === user.id}
                    className="text-destructive hover:text-destructive"
                  >
                    <ShieldOff className="size-3.5" />
                    Remove
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="mb-3 text-sm font-medium text-muted-foreground">
          Users ({regularUsers.length})
        </h3>
        <div className="space-y-2">
          {regularUsers.map((user) => (
            <div
              key={user.id}
              className="flex items-center justify-between rounded-lg border border-border p-3"
            >
              <div className="min-w-0 flex-1">
                <span className="text-sm text-foreground">
                  {user.name || user.email}
                </span>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
              <Button
                variant="ghost"
                size="xs"
                onClick={() => toggleAdmin(user)}
                disabled={updating === user.id}
              >
                <UserCog className="size-3.5" />
                Make Admin
              </Button>
            </div>
          ))}
          {regularUsers.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No other users found.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

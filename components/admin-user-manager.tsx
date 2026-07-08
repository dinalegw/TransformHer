'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Shield, ShieldOff, UserCog, Star, Loader2, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ALL_PERMISSIONS, type Permission } from '@/lib/permissions'

interface StoredUser {
  id: string
  name: string
  email: string
  isAdmin: boolean
  role: string
  rank?: string
  title?: string
  username?: string
  permissions: Permission[]
}

const ADMIN_RANKS = [
  { value: 'junior', label: 'Junior Admin' },
  { value: 'senior', label: 'Senior Admin' },
  { value: 'lead', label: 'Lead Admin' },
  { value: 'master', label: 'Master Admin' },
] as const

const PERMISSION_LABELS: Record<Permission, string> = {
  view_books: 'View Books',
  create_books: 'Create Books',
  edit_books: 'Edit Books',
  delete_books: 'Delete Books',
  archive_books: 'Archive Books',
  approve_changes: 'Approve Changes',
  manage_users: 'Manage Users',
  manage_admins: 'Manage Admins',
  view_orders: 'View Orders',
  manage_orders: 'Manage Orders',
  unlock_books: 'Unlock Books',
  view_analytics: 'View Analytics',
  manage_settings: 'Manage Settings',
}

interface Props {
  showOnlyUsers?: boolean
  showOnlyAdmins?: boolean
}

export function AdminUserManager({ showOnlyUsers, showOnlyAdmins }: Props) {
  const router = useRouter()
  const [users, setUsers] = useState<StoredUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updating, setUpdating] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [editPerms, setEditPerms] = useState<string | null>(null)

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

  const updatePermission = useCallback(async (userId: string, perm: Permission, add: boolean) => {
    const user = users.find(u => u.id === userId)
    if (!user || user.role === 'master_admin') return

    setUpdating(userId)
    setError('')

    try {
      const newPerms = add
        ? [...(user.permissions || []), perm]
        : (user.permissions || []).filter(p => p !== perm)

      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: newPerms }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update permissions')
      }

      await fetchUsers()
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setUpdating(null)
    }
  }, [users, fetchUsers, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const filtered = users.filter(u => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
    )
  })

  const adminUsers = filtered.filter(u => u.isAdmin)
  const regularUsers = filtered.filter(u => !u.isAdmin)

  const displayUsers = showOnlyAdmins ? adminUsers : showOnlyUsers ? regularUsers : filtered

  return (
    <div>
      {error && (
        <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="mb-4 flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="pl-9"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {users.length} total
        </p>
      </div>

      {editPerms && (
        <div className="mb-6 rounded-xl border border-border p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-medium text-foreground">
              Edit Permissions
            </h3>
            <Button variant="ghost" size="xs" onClick={() => setEditPerms(null)}>
              <X className="size-3.5" />
              Close
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {ALL_PERMISSIONS.map((perm) => {
              const user = users.find(u => u.id === editPerms)
              const has = user?.permissions?.includes(perm) ?? false
              return (
                <label
                  key={perm}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:bg-muted/50"
                >
                  <input
                    type="checkbox"
                    checked={has}
                    onChange={() => updatePermission(editPerms, perm, !has)}
                    disabled={updating === editPerms}
                    className="size-4 rounded border-border accent-primary"
                  />
                  {PERMISSION_LABELS[perm]}
                </label>
              )
            })}
          </div>
        </div>
      )}

      <div className="space-y-2">
        {displayUsers.map((user) => (
          <div
            key={user.id}
            className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-muted/30"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                {user.isAdmin ? (
                  <Shield className="size-4 text-primary" />
                ) : (
                  <UserCog className="size-4 text-muted-foreground" />
                )}
                <span className="text-sm font-medium text-foreground">
                  {user.name || user.email}
                </span>
                {user.role === 'master_admin' && (
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                    <Star className="size-3" />
                    Master
                  </span>
                )}
                {user.isAdmin && user.role !== 'master_admin' && (
                  <span className="inline-flex items-center rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                    Admin
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">{user.email}</p>
              {user.isAdmin && user.role !== 'master_admin' && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {(user.permissions || []).slice(0, 4).map(p => (
                    <span
                      key={p}
                      className="inline-flex rounded-full bg-secondary px-1.5 py-0.5 text-[9px] text-muted-foreground"
                    >
                      {PERMISSION_LABELS[p]}
                    </span>
                  ))}
                  {(user.permissions || []).length > 4 && (
                    <span className="text-[9px] text-muted-foreground">
                      +{(user.permissions || []).length - 4} more
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="ml-3 flex shrink-0 items-center gap-1">
              {user.isAdmin && user.role !== 'master_admin' && (
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => setEditPerms(editPerms === user.id ? null : user.id)}
                >
                  <Shield className="size-3.5" />
                  Permissions
                </Button>
              )}
              {user.role !== 'master_admin' && (
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => toggleAdmin(user)}
                  disabled={updating === user.id}
                  className={user.isAdmin ? 'text-destructive hover:text-destructive' : ''}
                >
                  {updating === user.id ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : user.isAdmin ? (
                    <ShieldOff className="size-3.5" />
                  ) : (
                    <UserCog className="size-3.5" />
                  )}
                  {user.isAdmin ? 'Remove' : 'Make Admin'}
                </Button>
              )}
            </div>
          </div>
        ))}
        {displayUsers.length === 0 && (
          <p className="py-4 text-center text-sm text-muted-foreground">
            {search ? 'No users match your search.' : 'No users found.'}
          </p>
        )}
      </div>
    </div>
  )
}

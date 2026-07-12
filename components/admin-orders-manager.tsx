'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ShoppingBag, Search, Unlock, Loader2, Check, Clock, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Order {
  id: number
  userId: string
  userName: string
  userEmail: string
  bookSlug: string
  bookTitle: string
  purchaseDate: string
  released: boolean
  releaseAt: string | null
  archived?: boolean
}

export function AdminOrdersManager() {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [unlocking, setUnlocking] = useState<string | null>(null)

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/orders')
      if (!res.ok) throw new Error('Failed to fetch orders')
      const data = await res.json()
      setOrders(data.orders || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load orders')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  const handleUnlock = useCallback(async (userId: string, bookSlug: string) => {
    setUnlocking(`${userId}:${bookSlug}`)
    setError('')
    try {
      const res = await fetch('/api/admin/orders/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, bookSlug }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to unlock')
      }
      await fetchOrders()
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setUnlocking(null)
    }
  }, [fetchOrders, router])

  const filtered = orders.filter(o => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      o.bookTitle.toLowerCase().includes(q) ||
      o.userName.toLowerCase().includes(q) ||
      o.userEmail.toLowerCase().includes(q)
    )
  })

  const pendingRelease = filtered.filter(o => !o.released)
  const released = filtered.filter(o => o.released)

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

      <div className="mb-4 flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by book, user, or email..."
            className="pl-9"
          />
        </div>
        <p className="text-sm text-muted-foreground">
          {filtered.length} order{filtered.length !== 1 ? 's' : ''}
        </p>
      </div>

      {pendingRelease.length > 0 && (
        <div className="mb-8">
          <h3 className="mb-3 text-sm font-medium text-muted-foreground">
            Pending Release ({pendingRelease.length})
          </h3>
          <div className="space-y-2">
            {pendingRelease.map((order) => (
              <div
                key={`${order.userId}:${order.bookSlug}`}
                className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-900/30 dark:bg-amber-950/10"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{order.bookTitle}</p>
                  <p className="text-xs text-muted-foreground">
                    {order.userName} — {order.userEmail}
                  </p>
                  <p className="text-[10px] text-muted-foreground/60">
                    Purchased: {new Date(order.purchaseDate).toLocaleDateString()}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleUnlock(order.userId, order.bookSlug)}
                  disabled={unlocking === `${order.userId}:${order.bookSlug}`}
                  className="shrink-0"
                >
                  {unlocking === `${order.userId}:${order.bookSlug}` ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Unlock className="size-3.5" />
                  )}
                  Unlock
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="mb-3 text-sm font-medium text-muted-foreground">
          All Orders ({filtered.length})
        </h3>
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <ShoppingBag className="size-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No orders found</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="bg-muted text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Book</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {released.map((order) => (
                  <tr key={`${order.userId}:${order.bookSlug}`} className="transition-colors hover:bg-muted/50">
                    <td className="max-w-40 truncate px-4 py-3 font-medium text-foreground">
                      {order.bookTitle}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <p>{order.userName}</p>
                      <p className="text-[10px]">{order.userEmail}</p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(order.purchaseDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-xs text-green-600">
                        <Check className="size-3" />
                        Released
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => handleUnlock(order.userId, order.bookSlug)}
                        disabled={unlocking === `${order.userId}:${order.bookSlug}`}
                      >
                        <Unlock className="size-3.5" />
                        Re-unlock
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

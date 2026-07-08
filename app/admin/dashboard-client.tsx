'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { BookOpen, Users, Shield, Bell, ShoppingBag } from 'lucide-react'
import { AdminBookManager } from '@/components/admin-book-manager'
import { AdminUserManager } from '@/components/admin-user-manager'
import { AdminPendingChanges } from '@/components/admin-pending-changes'
import { AdminOrdersManager } from '@/components/admin-orders-manager'
import { cn } from '@/lib/utils'

interface MergedBook {
  id: number | string
  slug: string
  title: string
  author: string
  category: string
  price: string
  currency: string
  coverImage: string
  fileUrl: string | null
  tagline: string
  description: string
  rating: string
  reviewsCount: number
  pages: number
  featured: boolean
  bestseller: boolean
  archived: boolean
  createdAt: Date | string
  source: 'seed' | 'admin'
}

interface Props {
  books: MergedBook[]
  userRole: string
  userEmail: string
  userName: string
  isMaster: boolean
}

type Tab = 'books' | 'users' | 'admins' | 'pending' | 'orders'

export function AdminDashboardClient({ books, userRole, userEmail, userName, isMaster }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tab = (searchParams.get('tab') as Tab) || 'books'

  const setTab = (t: Tab) => {
    router.push(`/admin?tab=${t}`)
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode; show: boolean }[] = [
    { id: 'books', label: 'Books', icon: <BookOpen className="size-4" />, show: true },
    { id: 'users', label: 'Users', icon: <Users className="size-4" />, show: isMaster },
    { id: 'admins', label: 'Admins', icon: <Shield className="size-4" />, show: isMaster },
    { id: 'orders', label: 'Orders', icon: <ShoppingBag className="size-4" />, show: true },
    { id: 'pending', label: 'Pending Changes', icon: <Bell className="size-4" />, show: isMaster },
  ]

  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-1 rounded-lg border border-border bg-muted/30 p-1">
        {tabs.filter(t => t.show).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              tab === t.id
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'books' && (
        <AdminBookManager
          books={books}
          userRole={userRole}
          userEmail={userEmail}
          userName={userName}
        />
      )}

      {tab === 'users' && isMaster && <AdminUserManager showOnlyUsers />}
      {tab === 'admins' && isMaster && <AdminUserManager showOnlyAdmins />}
      {tab === 'orders' && <AdminOrdersManager />}
      {tab === 'pending' && isMaster && <AdminPendingChanges />}
    </div>
  )
}

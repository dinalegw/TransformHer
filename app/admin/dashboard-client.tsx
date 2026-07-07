'use client'

import { useState } from 'react'
import { BookOpen, Users, Bell } from 'lucide-react'
import { AdminBookManager } from '@/components/admin-book-manager'
import { AdminUserManager } from '@/components/admin-user-manager'
import { AdminPendingChanges } from '@/components/admin-pending-changes'
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
  fileUrl?: string
  tagline: string
  description: string
  rating: string
  reviewsCount: number
  pages: number
  featured: boolean
  bestseller: boolean
  archived?: boolean
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

type Tab = 'books' | 'users' | 'pending'

export function AdminDashboardClient({ books, userRole, userEmail, userName, isMaster }: Props) {
  const [tab, setTab] = useState<Tab>('books')

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'books', label: 'Books', icon: <BookOpen className="size-4" /> },
    ...(isMaster ? [
      { id: 'users' as Tab, label: 'Admins', icon: <Users className="size-4" /> },
      { id: 'pending' as Tab, label: 'Pending Changes', icon: <Bell className="size-4" /> },
    ] : []),
  ]

  return (
    <div>
      <div className="mb-6 flex gap-1 rounded-lg border border-border bg-muted/30 p-1">
        {tabs.map((t) => (
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

      {tab === 'users' && isMaster && <AdminUserManager />}

      {tab === 'pending' && isMaster && <AdminPendingChanges />}
    </div>
  )
}

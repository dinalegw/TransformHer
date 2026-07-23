'use client'

/* eslint-disable react-hooks/set-state-in-effect -- Intentional: sync tab state from URL search params */

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  LayoutDashboard,
  BookOpen,
  Users,
  Shield,
  ShoppingBag,
  Bell,
  LogOut,
  ChevronLeft,
  Menu,
  X,
} from 'lucide-react'
import { cn, getDisplayName } from '@/lib/utils'
import { hasPermission, type Permission } from '@/lib/permissions'
import { Button } from '@/components/ui/button'

interface AdminSidebarProps {
  user: {
    id: string
    name: string
    email: string
    isAdmin: boolean
    role: string
    permissions: Permission[]
  }
}

interface NavItem {
  tab: string
  label: string
  icon: React.ReactNode
  permission?: Permission
}

export function AdminSidebar({ user }: AdminSidebarProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const currentTab = searchParams.get('tab') || 'books'
  const isMaster = user.role === 'master_admin'
  const [open, setOpen] = useState(false)

  // Close the drawer when the route or tab changes.
  useEffect(() => {
    setOpen(false)
  }, [pathname, searchParams])

  // Close on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const isActive = (tab: string) => pathname === '/admin' && currentTab === tab

  const navItems: NavItem[] = [
    { tab: '', label: 'Dashboard', icon: <LayoutDashboard className="size-4" /> },
    { tab: 'books', label: 'Books', icon: <BookOpen className="size-4" />, permission: 'view_books' },
    ...(isMaster ? ([
      { tab: 'users', label: 'Users', icon: <Users className="size-4" />, permission: 'manage_users' as Permission },
      { tab: 'admins', label: 'Admins', icon: <Shield className="size-4" />, permission: 'manage_admins' as Permission },
    ] as NavItem[]) : []),
    { tab: 'orders', label: 'Orders', icon: <ShoppingBag className="size-4" />, permission: 'view_orders' as Permission },
    ...(isMaster ? ([
      { tab: 'pending', label: 'Pending Changes', icon: <Bell className="size-4" />, permission: 'approve_changes' as Permission },
    ] as NavItem[]) : []),
  ]

  const filteredNav = navItems.filter(
    item => !item.permission || hasPermission(user.permissions, item.permission)
  )

  return (
    <>
      {/* Mobile top bar */}
      <div className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b border-border bg-background px-4 lg:hidden">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setOpen(true)}
          aria-label="Open admin menu"
        >
          <Menu className="size-5" />
        </Button>
        <Link href="/admin" className="font-heading text-lg tracking-tight text-foreground">
          Admin Panel
        </Link>
      </div>

      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'z-50 flex w-64 flex-col border-r border-border bg-background',
          'max-lg:fixed max-lg:inset-y-0 max-lg:left-0 max-lg:transition-transform max-lg:duration-300 max-lg:shadow-2xl',
          open ? 'max-lg:translate-x-0' : 'max-lg:-translate-x-full',
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-border px-5">
          <Link href="/admin" className="font-heading text-lg tracking-tight text-foreground">
            Admin Panel
          </Link>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setOpen(false)}
            aria-label="Close admin menu"
            className="lg:hidden"
          >
            <X className="size-5" />
          </Button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {filteredNav.map((item) => {
            const href = item.tab ? `/admin?tab=${item.tab}` : '/admin'
            return (
              <Link
                key={item.tab || 'dashboard'}
                href={href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                  isActive(item.tab)
                    ? 'bg-primary/10 font-medium text-primary'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                )}
              >
                {item.icon}
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-border p-3">
          <div className="mb-2 px-3 py-2">
            <p className="truncate text-sm font-medium text-foreground">
              {getDisplayName(user)}
            </p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            {isMaster && (
              <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                Master Admin
              </span>
            )}
          </div>
          <div className="flex gap-1">
            <Button asChild variant="ghost" size="sm" className="flex-1">
              <Link href="/">
                <ChevronLeft className="size-3.5" />
                Site
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 text-destructive hover:text-destructive"
              onClick={async () => {
                await fetch('/api/auth/logout', { method: 'POST' })
                window.location.href = '/login'
              }}
            >
              <LogOut className="size-3.5" />
              Sign out
            </Button>
          </div>
        </div>
      </aside>
    </>
  )
}

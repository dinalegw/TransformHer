'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import {
  LayoutDashboard,
  BookOpen,
  Users,
  Shield,
  ShoppingBag,
  Bell,
  Settings,
  LogOut,
  ChevronLeft,
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
      { tab: 'settings', label: 'Settings', icon: <Settings className="size-4" />, permission: 'manage_settings' as Permission },
    ] as NavItem[]) : []),
  ]

  const filteredNav = navItems.filter(
    item => !item.permission || hasPermission(user.permissions, item.permission)
  )

  return (
    <aside className="flex w-64 flex-col border-r border-border bg-background">
      <div className="flex h-16 items-center gap-2 border-b border-border px-5">
        <Link href="/admin" className="font-heading text-lg tracking-tight text-foreground">
          Admin Panel
        </Link>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {filteredNav.map((item) => {
          const href = item.tab ? `/admin?tab=${item.tab}` : '/admin'
          return (
            <Link
              key={item.tab}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                isActive(item.tab)
                  ? 'bg-primary/10 text-primary font-medium'
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
  )
}

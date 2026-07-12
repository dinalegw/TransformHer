import type { Metadata } from 'next'
import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import { AdminSidebar } from '@/components/admin-sidebar'

export const metadata: Metadata = {
  title: 'Admin Dashboard',
  description: 'Admin dashboard.',
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()
  if (!user || !user.isAdmin) redirect(user ? '/' : '/login')

  return (
    <div className="flex min-h-svh">
      <Suspense fallback={<div className="hidden w-64 shrink-0 lg:block" />}>
        <AdminSidebar user={user} />
      </Suspense>
      <div className="flex min-w-0 flex-1 flex-col pt-14 lg:pt-0">
        {children}
      </div>
    </div>
  )
}

import type { Metadata } from 'next'
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
  if (!user || !user.isAdmin) redirect('/login')

  return (
    <div className="flex min-h-svh">
      <AdminSidebar user={user} />
      <div className="flex flex-1 flex-col">
        {children}
      </div>
    </div>
  )
}

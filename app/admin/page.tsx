import type { Metadata } from 'next'
import { getCurrentUser, listAllUsers } from '@/lib/auth'
import { getAllMergedBooks, countPendingChanges } from '@/lib/admin-books'
import { AdminDashboardClient } from './dashboard-client'

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Admin dashboard.',
}

export default async function AdminDashboardPage() {
  const user = await getCurrentUser()
  const [books, pendingCount] = await Promise.all([
    getAllMergedBooks({ includeArchived: true }),
    countPendingChanges(),
  ])

  const allUsers = await listAllUsers()
  const totalUsers = allUsers.length
  const totalAdmins = allUsers.filter(u => u.isAdmin).length
  const activeBooks = books.filter(b => !b.archived).length
  const isMaster = user?.role === 'master_admin'

  return (
    <main className="flex-1">
      <div className="border-b border-border/60 bg-secondary/40">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <p className="text-xs uppercase tracking-luxe text-primary">Admin</p>
          <h1 className="mt-2 font-heading text-3xl text-foreground md:text-4xl">
            Dashboard
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Welcome back, {user?.name}
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Total Books</p>
            <p className="mt-1 font-heading text-3xl text-foreground">{books.length}</p>
            <p className="text-xs text-muted-foreground">{activeBooks} active</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Total Users</p>
            <p className="mt-1 font-heading text-3xl text-foreground">{totalUsers}</p>
            <p className="text-xs text-muted-foreground">{totalAdmins} admins</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Pending Changes</p>
            <p className="mt-1 font-heading text-3xl text-foreground">
              {isMaster ? pendingCount : '—'}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Your Role</p>
            <p className="mt-1 font-heading text-3xl text-foreground capitalize">
              {isMaster ? 'Master' : 'Admin'}
            </p>
          </div>
        </div>

        <AdminDashboardClient
          books={books}
          userRole={user?.role ?? ''}
          userEmail={user?.email ?? ''}
          userName={user?.name ?? ''}
          isMaster={isMaster}
        />
      </div>
    </main>
  )
}

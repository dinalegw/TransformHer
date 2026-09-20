import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { UserRoundX } from 'lucide-react'
import { getCurrentUser, listAllUsers } from '@/lib/auth'
import { getAllMergedBooks, countPendingChanges } from '@/lib/admin-books'
import { getDeletedAccountDashboardSummary } from '@/lib/deleted-account-dashboard'
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
  const storageReady = !process.env.VERCEL || Boolean(process.env.BLOB_READ_WRITE_TOKEN)

  let deletedSummary: Awaited<ReturnType<typeof getDeletedAccountDashboardSummary>> = {
    total: 0,
    recent: [],
  }

  if (isMaster && user) {
    try {
      deletedSummary = await getDeletedAccountDashboardSummary({ id: user.id, email: user.email })
    } catch (err) {
      console.error('[admin] unable to load deleted-account summary', err)
    }
  }

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
        <div className={`mb-8 grid gap-4 sm:grid-cols-2 ${isMaster ? 'lg:grid-cols-5' : 'lg:grid-cols-4'}`}>
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
          {isMaster && (
            <Link
              href="/admin/deleted-users"
              className="rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/50 hover:bg-muted/30"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Deleted Accounts</p>
                <UserRoundX className="size-4 text-primary" />
              </div>
              <p className="mt-1 font-heading text-3xl text-foreground">{deletedSummary.total}</p>
              <p className="text-xs text-muted-foreground">Open restricted archive</p>
            </Link>
          )}
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Your Role</p>
            <p className="mt-1 font-heading text-3xl text-foreground capitalize">
              {isMaster ? 'Master' : 'Admin'}
            </p>
          </div>
        </div>

        {isMaster && deletedSummary.recent.length > 0 && (
          <section className="mb-8 rounded-xl border border-border bg-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-primary">Account closure activity</p>
                <h2 className="mt-1 font-heading text-xl text-foreground">Recently deleted accounts</h2>
              </div>
              <Link href="/admin/deleted-users" className="text-sm font-medium text-primary hover:underline">
                View all deleted accounts
              </Link>
            </div>
            <div className="mt-4 divide-y divide-border">
              {deletedSummary.recent.map((row) => (
                <Link
                  key={row.id}
                  href={`/admin/deleted-users/${row.id}`}
                  className="grid gap-1 py-3 transition-colors hover:text-primary md:grid-cols-[1.2fr_1.5fr_1fr_2fr] md:items-center md:gap-4"
                >
                  <span className="font-medium text-foreground">{row.originalName}</span>
                  <span className="text-sm text-muted-foreground">{row.originalEmail}</span>
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">
                    {row.deletionType === 'self' ? 'Self-deleted' : 'Admin deleted'}
                  </span>
                  <span className="truncate text-sm text-muted-foreground" title={row.deletionReason || undefined}>
                    {row.deletionReason || 'No reason recorded'}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        <Suspense>
          <AdminDashboardClient
            books={books}
            userRole={user?.role ?? ''}
            userEmail={user?.email ?? ''}
            userName={user?.name ?? ''}
            isMaster={isMaster}
            storageReady={storageReady}
          />
        </Suspense>
      </div>
    </main>
  )
}

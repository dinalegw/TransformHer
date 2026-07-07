import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { getAllMergedBooks } from '@/lib/admin-books'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { AdminBookManager } from '@/components/admin-book-manager'

export const metadata: Metadata = {
  title: 'Admin',
  description: 'Manage the library.',
}

export default async function AdminPage() {
  const user = await getCurrentUser()
  if (!user || !user.isAdmin) redirect('/login')

  const books = await getAllMergedBooks()

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="flex-1">
        <section className="border-b border-border/60 bg-secondary/40">
          <div className="mx-auto max-w-6xl px-4 py-10 md:px-6">
            <p className="text-xs uppercase tracking-luxe text-primary">Admin</p>
            <h1 className="mt-2 font-heading text-3xl text-foreground md:text-4xl">
              Library Management
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Welcome back, {user.name}. You manage {books.length} books.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-10 md:px-6">
          <AdminBookManager books={books} />
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}

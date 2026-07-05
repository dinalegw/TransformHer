import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { getAllBooks } from '@/lib/books'
import { formatPrice } from '@/lib/format'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'

export const metadata: Metadata = {
  title: 'Admin',
  description: 'Manage the library.',
}

export default async function AdminPage() {
  const user = await getCurrentUser()
  if (!user || !user.isAdmin) redirect('/login')

  const books = await getAllBooks()

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
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">Author</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Price</th>
                  <th className="px-4 py-3 font-medium">Rating</th>
                  <th className="px-4 py-3 font-medium">Featured</th>
                  <th className="px-4 py-3 font-medium">Bestseller</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {books.map((book) => (
                  <tr key={book.id} className="transition-colors hover:bg-muted/50">
                    <td className="px-4 py-3 font-medium text-foreground">{book.title}</td>
                    <td className="px-4 py-3 text-muted-foreground">{book.author}</td>
                    <td className="px-4 py-3 text-muted-foreground">{book.category}</td>
                    <td className="px-4 py-3 text-foreground">{formatPrice(book.price, book.currency)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{Number(book.rating).toFixed(1)}</td>
                    <td className="px-4 py-3">{book.featured ? <span className="text-green-600">Yes</span> : <span className="text-muted-foreground">No</span>}</td>
                    <td className="px-4 py-3">{book.bestseller ? <span className="text-green-600">Yes</span> : <span className="text-muted-foreground">No</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}

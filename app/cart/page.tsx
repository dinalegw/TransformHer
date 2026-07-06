import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { fetchCart } from '@/lib/library'
import { SEED_BOOKS } from '@/lib/seed'
import { formatPrice } from '@/lib/format'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { CartView } from './cart-view'

export const metadata: Metadata = {
  title: 'Cart',
  description: 'Your cart.',
}

export default async function CartPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const items = await fetchCart(user.id)
  const cartItems = items
    .map(i => {
      const book = SEED_BOOKS.find(b => b.id === i.bookId)
      return book ? { ...i, book } : null
    })
    .filter((b): b is NonNullable<typeof b> => b != null)

  const total = cartItems.reduce((sum, item) => sum + Number(item.book.price), 0)

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className="flex-1">
        <section className="border-b border-border/60 bg-secondary/40">
          <div className="mx-auto max-w-6xl px-4 py-10 md:px-6">
            <p className="text-xs uppercase tracking-luxe text-primary">Shopping</p>
            <h1 className="mt-2 font-heading text-3xl text-foreground md:text-4xl">
              Cart
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {cartItems.length} {cartItems.length === 1 ? 'item' : 'items'} &middot;{' '}
              {formatPrice(total)}
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-4 py-10 md:px-6">
          <CartView items={cartItems} total={total} />
        </section>
      </main>
      <SiteFooter />
    </div>
  )
}

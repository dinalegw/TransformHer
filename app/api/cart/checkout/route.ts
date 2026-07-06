import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { fetchCart } from '@/lib/library'
import { initializePaystackPayment } from '@/lib/paystack'
import { SEED_BOOKS } from '@/lib/seed'
import { getBaseUrl } from '@/lib/utils'

export async function POST() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const items = await fetchCart(user.id)
    if (items.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 })
    }

    const cartBooks = items
      .map(i => SEED_BOOKS.find(b => b.id === i.bookId))
      .filter((b): b is NonNullable<typeof b> => b != null)

    const totalKobo = cartBooks.reduce((sum, b) => sum + Number(b.price), 0)

    const reference = `CART-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`
    const result = await initializePaystackPayment({
      email: user.email,
      amount: totalKobo,
      reference,
      metadata: {
        userId: user.id,
        cartCheckout: true,
        bookIds: cartBooks.map(b => b.id),
        bookSlugs: cartBooks.map(b => b.slug),
        bookTitles: cartBooks.map(b => b.title),
      },
      callback_url: `${getBaseUrl()}/cart?purchased=true`,
    })

    if (!result.status) {
      return NextResponse.json({ error: result.message ?? 'Paystack initialization failed' }, { status: 502 })
    }

    return NextResponse.json({ authorization_url: result.data.authorization_url, reference })
  } catch (err) {
    console.error('Checkout failed:', err)
    return NextResponse.json({ error: 'Checkout failed' }, { status: 500 })
  }
}

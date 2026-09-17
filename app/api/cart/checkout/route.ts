import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { fetchCart } from '@/lib/library'
import { initializePaystackPayment } from '@/lib/paystack'
import { getAllMergedBooks } from '@/lib/admin-books'
import { getBaseUrl } from '@/lib/utils'
import { checkRateLimit } from '@/lib/rate-limit'

export async function POST(req: Request) {
  const rateLimit = checkRateLimit(req, '/api/cart/checkout')
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many requests', retryAfter: rateLimit.retryAfter },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter) } },
    )
  }

  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const items = await fetchCart(user.id)
    if (items.length === 0) return NextResponse.json({ error: 'Cart is empty' }, { status: 400 })

    const allBooks = await getAllMergedBooks()
    const bookMap = new Map(allBooks.map((book) => [book.id, book]))
    const cartBooks = items
      .map((item) => bookMap.get(item.bookId))
      .filter((book): book is NonNullable<typeof book> => book != null)

    if (cartBooks.length !== items.length || cartBooks.some((book) => book.currency !== 'NGN')) {
      return NextResponse.json({ error: 'Your cart contains unavailable or unsupported-currency books.' }, { status: 400 })
    }

    const expectedAmountMinor = cartBooks.reduce(
      (sum, book) => sum + Math.round(Number(book.price) * 100),
      0,
    )
    if (!Number.isSafeInteger(expectedAmountMinor) || expectedAmountMinor <= 0) {
      return NextResponse.json({ error: 'Unable to calculate a valid cart total.' }, { status: 400 })
    }

    const reference = `CART-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`
    const result = await initializePaystackPayment({
      email: user.email,
      amount: expectedAmountMinor / 100,
      currency: 'NGN',
      reference,
      metadata: {
        userId: user.id,
        cartCheckout: true,
        bookIds: cartBooks.map((book) => book.id),
        bookSlugs: cartBooks.map((book) => book.slug),
        bookTitles: cartBooks.map((book) => book.title),
        expectedAmountMinor,
        expectedCurrency: 'NGN',
      },
      callback_url: `${getBaseUrl()}/cart?purchased=true`,
    })

    if (!result.status || !result.data?.authorization_url || !result.data.reference) {
      return NextResponse.json({ error: result.message ?? 'Paystack initialization failed' }, { status: 502 })
    }

    return NextResponse.json({
      authorization_url: result.data.authorization_url,
      reference: result.data.reference,
    })
  } catch (err) {
    console.error('[checkout] initialization failed', err)
    return NextResponse.json({ error: 'Unable to start checkout right now.' }, { status: 500 })
  }
}

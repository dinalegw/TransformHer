import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getBookBySlug } from '@/lib/books'
import { recordPurchase } from '@/lib/library'
import { verifyPaystackPayment } from '@/lib/paystack'
import { sendPurchaseConfirmation, sendAdminOrderNotification } from '@/lib/email'
import { formatPrice } from '@/lib/format'
import { checkRateLimit } from '@/lib/rate-limit'

function isReference(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{8,160}$/.test(value)
}

export async function POST(req: Request) {
  const rateLimit = await checkRateLimit(req, '/api/paystack/confirm')
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many requests', retryAfter: rateLimit.retryAfter },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter) } },
    )
  }

  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json().catch(() => ({}))
    const { reference, bookSlug } = body
    if (!isReference(reference) || typeof bookSlug !== 'string') {
      return NextResponse.json({ error: 'A valid payment reference and book slug are required' }, { status: 400 })
    }

    const book = await getBookBySlug(bookSlug)
    if (!book) return NextResponse.json({ error: 'Book not found' }, { status: 404 })

    const result = await verifyPaystackPayment(reference)
    const payment = result.data
    const metadata = payment?.metadata
    if (!result.status || payment?.status !== 'success' || !metadata) {
      return NextResponse.json({ error: 'Payment verification failed' }, { status: 402 })
    }
    if (payment.reference && payment.reference !== reference) {
      return NextResponse.json({ error: 'Payment reference mismatch' }, { status: 402 })
    }
    if (metadata.cartCheckout || metadata.userId !== user.id || metadata.bookSlug !== book.slug) {
      return NextResponse.json({ error: 'Payment does not match this purchase' }, { status: 403 })
    }
    if (payment.customer?.email?.trim().toLowerCase() !== user.email.trim().toLowerCase()) {
      return NextResponse.json({ error: 'Payment email does not match this account' }, { status: 403 })
    }

    const verifiedMinor = Number(payment.amount)
    const snapshotMinor = Number(metadata.expectedAmountMinor)
    const expectedMinor = Number.isSafeInteger(snapshotMinor) && snapshotMinor > 0
      ? snapshotMinor
      : Math.round(Number(book.price) * 100)
    const expectedCurrency = typeof metadata.expectedCurrency === 'string'
      ? metadata.expectedCurrency
      : book.currency

    if (
      !Number.isSafeInteger(verifiedMinor)
      || payment.currency !== expectedCurrency
      || verifiedMinor !== expectedMinor
    ) {
      return NextResponse.json({ error: 'Payment amount mismatch' }, { status: 402 })
    }

    const recorded = await recordPurchase(user.id, book.id, book.slug, payment.reference)

    if (recorded) {
      const amount = formatPrice(verifiedMinor / 100, payment.currency ?? book.currency)
      const customerName = payment.customer?.first_name
        ? `${payment.customer.first_name} ${payment.customer.last_name ?? ''}`.trim()
        : user.name

      try {
        await sendPurchaseConfirmation(user.email, customerName, book.title, amount)
      } catch (emailError) {
        console.error('[paystack] purchase confirmation email failed', emailError)
      }

      const adminEmail = process.env.ADMIN_EMAIL
      if (adminEmail) {
        try {
          await sendAdminOrderNotification(adminEmail, user.email, customerName, book.title, amount)
        } catch (emailError) {
          console.error('[paystack] admin order email failed', emailError)
        }
      }
    }

    return NextResponse.json({ success: true, alreadyRecorded: !recorded })
  } catch (error) {
    console.error('[paystack] single-book confirmation failed', { error })
    return NextResponse.json({ error: 'Unable to confirm payment. Please contact support with your reference.' }, { status: 500 })
  }
}

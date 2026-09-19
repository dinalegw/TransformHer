import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { verifyPaystackPayment } from '@/lib/paystack'
import { recordPurchase, removeFromCart } from '@/lib/library'
import { getAllMergedBooks } from '@/lib/admin-books'
import { sendPurchaseConfirmation, sendAdminOrderNotification } from '@/lib/email'
import { formatPrice } from '@/lib/format'
import { checkRateLimit } from '@/lib/rate-limit'

function isReference(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{8,160}$/.test(value)
}

export async function POST(req: Request) {
  const rateLimit = await checkRateLimit(req, '/api/cart/checkout/confirm')
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
    const { reference } = body
    if (!isReference(reference)) {
      return NextResponse.json({ error: 'A valid reference is required' }, { status: 400 })
    }

    const result = await verifyPaystackPayment(reference)
    const payment = result.data
    const metadata = payment?.metadata
    if (!result.status || payment?.status !== 'success' || !metadata?.cartCheckout) {
      return NextResponse.json({ error: 'Payment verification failed' }, { status: 402 })
    }
    if (payment.reference && payment.reference !== reference) {
      return NextResponse.json({ error: 'Payment reference mismatch' }, { status: 402 })
    }
    if (metadata.userId !== user.id) {
      return NextResponse.json({ error: 'Payment does not belong to this account' }, { status: 403 })
    }

    const customerEmail = payment.customer?.email?.trim().toLowerCase()
    if (customerEmail && customerEmail !== user.email.trim().toLowerCase()) {
      return NextResponse.json({ error: 'Payment email does not match this account' }, { status: 403 })
    }

    const paidBookIds = Array.isArray(metadata.bookIds) ? metadata.bookIds.map(Number) : []
    const paidBookSlugs = Array.isArray(metadata.bookSlugs) ? metadata.bookSlugs.map(String) : []
    if (
      paidBookIds.length === 0 ||
      paidBookIds.length !== paidBookSlugs.length ||
      paidBookIds.some((id) => !Number.isSafeInteger(id) || id <= 0) ||
      new Set(paidBookIds).size !== paidBookIds.length
    ) {
      return NextResponse.json({ error: 'Payment item metadata is invalid' }, { status: 402 })
    }

    const allBooks = await getAllMergedBooks()
    const bookMap = new Map(allBooks.map((book) => [book.id, book]))
    const purchasedBooks = paidBookIds.map((id, index) => {
      const book = bookMap.get(id)
      if (!book || book.slug !== paidBookSlugs[index]) return null
      return book
    })
    if (purchasedBooks.some((book) => !book)) {
      return NextResponse.json({ error: 'A purchased book can no longer be resolved. Please contact support with your reference.' }, { status: 409 })
    }

    const verifiedMinor = Number(payment.amount)
    const expectedMinorFromSnapshot = Number(metadata.expectedAmountMinor)
    const expectedCurrency = metadata.expectedCurrency || 'NGN'
    const fallbackExpectedMinor = purchasedBooks.reduce(
      (sum, book) => sum + Math.round(Number(book!.price) * 100),
      0,
    )
    const expectedMinor = Number.isSafeInteger(expectedMinorFromSnapshot) && expectedMinorFromSnapshot > 0
      ? expectedMinorFromSnapshot
      : fallbackExpectedMinor

    if (
      !Number.isSafeInteger(verifiedMinor)
      || payment.currency !== expectedCurrency
      || verifiedMinor !== expectedMinor
    ) {
      return NextResponse.json({ error: 'Payment amount mismatch' }, { status: 402 })
    }

    const newlyRecorded = [] as NonNullable<(typeof purchasedBooks)[number]>[]
    for (const book of purchasedBooks) {
      if (!book) continue
      const recorded = await recordPurchase(user.id, book.id, book.slug, payment.reference)
      if (recorded) newlyRecorded.push(book)
      await removeFromCart(user.id, book.id)
    }

    if (newlyRecorded.length > 0) {
      const emailTo = customerEmail || user.email
      const customerName = payment.customer?.first_name
        ? `${payment.customer.first_name} ${payment.customer.last_name ?? ''}`.trim()
        : user.name
      const amount = formatPrice(verifiedMinor / 100, payment.currency ?? 'NGN')
      const titleSummary = newlyRecorded.length === 1
        ? newlyRecorded[0].title
        : `${newlyRecorded.length} books`

      try {
        await sendPurchaseConfirmation(emailTo, customerName, titleSummary, amount)
      } catch (emailError) {
        console.error('[checkout] purchase confirmation email failed', emailError)
      }

      const adminEmail = process.env.ADMIN_EMAIL
      if (adminEmail) {
        try {
          await sendAdminOrderNotification(
            adminEmail,
            emailTo,
            customerName,
            newlyRecorded.map((book) => book.title).join(', '),
            amount,
          )
        } catch (emailError) {
          console.error('[checkout] admin order email failed', emailError)
        }
      }
    }

    return NextResponse.json({
      success: true,
      alreadyRecorded: newlyRecorded.length === 0,
      bookSlugs: purchasedBooks.filter(Boolean).map((book) => book!.slug),
    })
  } catch (err) {
    console.error('[checkout] confirmation failed', err)
    return NextResponse.json({ error: 'Unable to confirm checkout. Please contact support with your reference.' }, { status: 500 })
  }
}

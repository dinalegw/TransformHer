import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { initializePaystackPayment } from '@/lib/paystack'
import { getBookBySlug } from '@/lib/books'
import { getLibraryItem } from '@/lib/library'
import { getBaseUrl } from '@/lib/utils'
import { checkRateLimit } from '@/lib/rate-limit'

export async function POST(req: Request) {
  const rateLimit = await checkRateLimit(req, '/api/paystack/initialize')
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many requests', retryAfter: rateLimit.retryAfter },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter) } },
    )
  }

  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const bookSlug = body.bookSlug
  if (typeof bookSlug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(bookSlug)) {
    return NextResponse.json({ error: 'A valid bookSlug is required' }, { status: 400 })
  }

  const book = await getBookBySlug(bookSlug)
  if (!book) return NextResponse.json({ error: 'Book not found' }, { status: 404 })

  const alreadyOwned = await getLibraryItem(user.id, book.id)
  if (alreadyOwned) {
    return NextResponse.json({ error: 'You already own this book' }, { status: 409 })
  }

  const expectedAmountMinor = Math.round(Number(book.price) * 100)
  if (!Number.isSafeInteger(expectedAmountMinor) || expectedAmountMinor <= 0) {
    return NextResponse.json({ error: 'This book does not have a valid checkout price.' }, { status: 400 })
  }

  const reference = `TX-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`
  const result = await initializePaystackPayment({
    email: user.email,
    amount: expectedAmountMinor / 100,
    currency: book.currency,
    reference,
    metadata: {
      userId: user.id,
      bookSlug,
      bookTitle: book.title,
      expectedAmountMinor,
      expectedCurrency: book.currency,
    },
    callback_url: `${getBaseUrl()}/books/${bookSlug}?purchased=true`,
  })

  if (!result.status || !result.data?.authorization_url || !result.data.reference) {
    return NextResponse.json({ error: result.message ?? 'Payment initialization failed' }, { status: 502 })
  }

  return NextResponse.json({ authorization_url: result.data.authorization_url, reference: result.data.reference })
}

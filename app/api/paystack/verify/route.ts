import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { verifyPaystackPayment } from '@/lib/paystack'
import { checkRateLimit } from '@/lib/rate-limit'

function isReference(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{8,160}$/.test(value)
}

/**
 * Read-only verification endpoint. Purchase recording and email notifications
 * happen in the dedicated confirmation routes, where amount/items are checked.
 */
export async function POST(req: Request) {
  const rateLimit = checkRateLimit(req, '/api/paystack/verify')
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many requests', retryAfter: rateLimit.retryAfter },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter) } },
    )
  }

  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { reference } = await req.json()
    if (!isReference(reference)) {
      return NextResponse.json({ error: 'A valid reference is required' }, { status: 400 })
    }

    const result = await verifyPaystackPayment(reference)
    const payment = result.data
    const metadata = payment?.metadata

    if (!result.status || !payment || !metadata) {
      return NextResponse.json({ verified: false }, { status: 402 })
    }

    const customerEmail = payment.customer?.email?.trim().toLowerCase()
    if (metadata.userId !== user.id || customerEmail !== user.email.trim().toLowerCase()) {
      return NextResponse.json({ error: 'Payment does not belong to this account' }, { status: 403 })
    }

    // Never expose Paystack's complete customer/metadata response to the browser.
    return NextResponse.json({
      verified: payment.status === 'success',
      status: payment.status ?? 'unknown',
      reference: payment.reference ?? reference,
    })
  } catch (error) {
    console.error('[paystack] verification failed', { error })
    return NextResponse.json({ error: 'Unable to verify payment right now.' }, { status: 500 })
  }
}

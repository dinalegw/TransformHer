import { NextResponse } from 'next/server'
import { verifyAndMarkEmailVerificationToken } from '@/lib/email-verification-link'
import { sendEmailVerifiedEmail } from '@/lib/email'
import { getBaseUrl } from '@/lib/utils'
import { checkRateLimit } from '@/lib/rate-limit'

function sameOrigin(req: Request): boolean {
  const origin = req.headers.get('origin')
  if (!origin) return true
  try {
    return new URL(origin).host === new URL(req.url).host
  } catch {
    return false
  }
}

export async function POST(req: Request) {
  try {
    if (!sameOrigin(req)) {
      return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 })
    }

    const rate = await checkRateLimit(req, '/api/auth/verify-email')
    if (!rate.allowed) {
      return NextResponse.json(
        { error: 'Too many verification attempts. Please wait and try again.', retryAfter: rate.retryAfter },
        { status: 429, headers: { 'Retry-After': String(rate.retryAfter) } },
      )
    }

    const body = await req.json().catch(() => ({}))
    const token = typeof body.token === 'string' ? body.token : ''
    if (!token) {
      return NextResponse.json({ error: 'Verification token is required' }, { status: 400 })
    }

    const verified = await verifyAndMarkEmailVerificationToken(token)
    if (!verified) {
      return NextResponse.json(
        { error: 'This verification link is invalid, expired, or no longer belongs to this account.' },
        { status: 400 },
      )
    }

    if (!verified.alreadyVerified) {
      try {
        await sendEmailVerifiedEmail(verified.email, verified.name, `${getBaseUrl()}/login`)
      } catch (err) {
        // Verification is authoritative. A confirmation-email failure must not
        // roll the verified state back.
        console.error('[auth/verify-email] confirmation email failed', err)
      }
    }

    return NextResponse.json({
      success: true,
      alreadyVerified: verified.alreadyVerified,
      message: verified.alreadyVerified
        ? 'This email is already verified and locked to the account.'
        : 'Email verified successfully. You can now sign in.',
    })
  } catch (err) {
    const unavailable = err instanceof Error && err.message === 'Database not available'
    if (unavailable) {
      return NextResponse.json(
        { error: 'Email verification is temporarily unavailable. Please try again.' },
        { status: 503 },
      )
    }

    console.error('[auth/verify-email] unexpected verification failure', err)
    return NextResponse.json({ error: 'Unable to verify this email right now.' }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { getCurrentUser, isEmailVerified } from '@/lib/auth'
import {
  confirmEmailVerificationCode,
  EmailVerificationCodeError,
  invalidateEmailVerificationCode,
  issueEmailVerificationCode,
} from '@/lib/email-verification-code'
import {
  sendEmailVerificationCodeEmail,
  sendEmailVerifiedEmail,
  waitForCourierDispatch,
} from '@/lib/email'
import { checkRateLimit } from '@/lib/rate-limit'
import { getBaseUrl } from '@/lib/utils'

function sameOrigin(req: Request): boolean {
  const origin = req.headers.get('origin')
  if (!origin) return true
  try {
    return new URL(origin).host === new URL(req.url).host
  } catch {
    return false
  }
}

function verificationError(error: unknown) {
  if (error instanceof EmailVerificationCodeError) {
    const status = error.code === 'cooldown'
      ? 429
      : error.code === 'account_unavailable'
        ? 403
        : error.code === 'already_verified'
          ? 409
          : 400
    return NextResponse.json(
      { error: error.message, code: error.code, retryAfter: error.retryAfter },
      {
        status,
        headers: error.retryAfter ? { 'Retry-After': String(error.retryAfter) } : undefined,
      },
    )
  }
  if (error instanceof Error && error.message === 'Database not available') {
    return NextResponse.json({ error: 'Verification service is temporarily unavailable.' }, { status: 503 })
  }
  console.error('[auth/email-verification-code] unexpected failure', error)
  return NextResponse.json({ error: 'Unable to complete email verification right now.' }, { status: 500 })
}

/** Send a fresh six-digit verification code to the signed-in user's existing email. */
export async function POST(req: Request) {
  try {
    if (!sameOrigin(req)) {
      return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 })
    }

    const rate = await checkRateLimit(req, '/api/auth/email-verification-code/request')
    if (!rate.allowed) {
      return NextResponse.json(
        { error: 'Too many verification requests. Please wait and try again.', retryAfter: rate.retryAfter },
        { status: 429, headers: { 'Retry-After': String(rate.retryAfter) } },
      )
    }

    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

    if (await isEmailVerified(user.email)) {
      return NextResponse.json({ success: true, verified: true, message: 'Your email is already verified.' })
    }

    const issued = await issueEmailVerificationCode(user.id)
    try {
      const receipt = await sendEmailVerificationCodeEmail(
        user.email,
        user.name,
        issued.code,
        issued.expiresInMinutes,
      )
      const dispatch = await waitForCourierDispatch(receipt.requestId)
      if (dispatch.state === 'failed') {
        await invalidateEmailVerificationCode(user.id)
        console.error('[auth/email-verification-code] Courier rejected verification code email', {
          requestId: receipt.requestId,
          status: dispatch.status,
        })
        return NextResponse.json(
          { error: 'We could not send the verification code right now. Please try again.' },
          { status: 503 },
        )
      }
    } catch (error) {
      await invalidateEmailVerificationCode(user.id)
      console.error('[auth/email-verification-code] verification email send failed', error)
      return NextResponse.json(
        { error: 'We could not send the verification code right now. Please try again.' },
        { status: 503 },
      )
    }

    return NextResponse.json({
      success: true,
      verified: false,
      expiresInMinutes: issued.expiresInMinutes,
      message: `A 6-digit verification code was sent to ${user.email}.`,
    })
  } catch (error) {
    return verificationError(error)
  }
}

/** Confirm the six-digit code and permanently mark the account email verified. */
export async function PUT(req: Request) {
  try {
    if (!sameOrigin(req)) {
      return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 })
    }

    const rate = await checkRateLimit(req, '/api/auth/email-verification-code/confirm')
    if (!rate.allowed) {
      return NextResponse.json(
        { error: 'Too many verification attempts. Please wait and try again.', retryAfter: rate.retryAfter },
        { status: 429, headers: { 'Retry-After': String(rate.retryAfter) } },
      )
    }

    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 })

    if (await isEmailVerified(user.email)) {
      return NextResponse.json({ success: true, verified: true, message: 'Your email is already verified.' })
    }

    const body = await req.json().catch(() => ({}))
    const code = typeof body.code === 'string' ? body.code : ''
    await confirmEmailVerificationCode(user.id, code)

    try {
      await sendEmailVerifiedEmail(user.email, user.name, `${getBaseUrl()}/profile`)
    } catch (error) {
      // Verification itself is authoritative; a confirmation-email failure must
      // not undo the verified account state.
      console.error('[auth/email-verification-code] verified confirmation email failed', error)
    }

    return NextResponse.json({
      success: true,
      verified: true,
      message: 'Your email has been verified successfully and is now locked to this account.',
    })
  } catch (error) {
    return verificationError(error)
  }
}

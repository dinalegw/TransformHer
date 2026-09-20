import { NextResponse } from 'next/server'
import { emailExists } from '@/lib/auth'
import { generatePasswordResetToken } from '@/lib/password-reset'
import { sendPasswordResetEmail, waitForCourierDispatch } from '@/lib/email'
import { getBaseUrl } from '@/lib/utils'
import { checkRateLimit } from '@/lib/rate-limit'
import { isSameOriginRequest } from '@/lib/request-security'

const SAFE_SUCCESS_MESSAGE =
  'Password reset request received. If an account matches this email, reset instructions will arrive shortly. Check your inbox and spam folder.'

export async function POST(req: Request) {
  if (!isSameOriginRequest(req)) {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 })
  }

  try {
    const rateLimit = await checkRateLimit(req, '/api/auth/forgot-password')
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many reset requests. Please wait a minute and try again.', retryAfter: rateLimit.retryAfter },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter) } },
      )
    }

    const body = await req.json().catch(() => ({}))
    const { email } = body
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const normalizedEmail = email.trim().toLowerCase()
    const exists = await emailExists(normalizedEmail)

    // Do not reveal whether an address is registered. Unknown addresses get the
    // same public success response, which prevents account enumeration.
    if (!exists) {
      return NextResponse.json({ message: SAFE_SUCCESS_MESSAGE })
    }

    const token = await generatePasswordResetToken(normalizedEmail)
    if (!token) {
      return NextResponse.json({ message: SAFE_SUCCESS_MESSAGE })
    }

    const resetLink = `${getBaseUrl()}/reset-password?token=${token}`

    try {
      const receipt = await sendPasswordResetEmail(normalizedEmail, resetLink)
      const dispatch = await waitForCourierDispatch(receipt.requestId)

      if (dispatch.state === 'failed') {
        console.error('Forgot password email failed in Courier:', {
          requestId: receipt.requestId,
          status: dispatch.status,
        })
        return NextResponse.json(
          { error: 'We could not send the password reset email right now. Please wait a minute and try again.' },
          { status: 503 },
        )
      }

      console.info('Forgot password email request accepted:', {
        requestId: receipt.requestId,
        status: dispatch.status,
      })
    } catch (emailErr) {
      console.error('Forgot password email failed to send:', emailErr)
      return NextResponse.json(
        { error: 'We could not send the password reset email right now. Please wait a minute and try again.' },
        { status: 503 },
      )
    }

    return NextResponse.json({ message: SAFE_SUCCESS_MESSAGE })
  } catch (err) {
    console.error('Forgot password error:', err)
    return NextResponse.json(
      { error: 'Unable to process the password reset request right now.' },
      { status: 500 },
    )
  }
}

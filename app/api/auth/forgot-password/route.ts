import { NextResponse } from 'next/server'
import { emailExists } from '@/lib/auth'
import { generatePasswordResetToken } from '@/lib/password-reset'
import { sendPasswordResetEmail } from '@/lib/email'
import { getBaseUrl } from '@/lib/utils'
import { checkRateLimit } from '@/lib/rate-limit'

export async function POST(req: Request) {
  try {
    const rateLimit = await checkRateLimit(req, '/api/auth/forgot-password')
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests', retryAfter: rateLimit.retryAfter },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter) } },
      )
    }

    const { email } = await req.json()
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const normalizedEmail = String(email).trim().toLowerCase()
    const message = {
      message: 'If that email is registered, a reset link has been sent.',
    }

    const exists = await emailExists(normalizedEmail)
    if (!exists) return NextResponse.json(message)

    const token = await generatePasswordResetToken(normalizedEmail)
    if (!token) return NextResponse.json(message)

    const resetLink = `${getBaseUrl()}/reset-password?token=${token}`

    try {
      await sendPasswordResetEmail(normalizedEmail, resetLink)
    } catch (emailErr) {
      console.error('Forgot password email failed to send:', emailErr)
    }

    return NextResponse.json(message)
  } catch (err) {
    console.error('Forgot password error:', err)
    return NextResponse.json(
      { error: 'Unable to process the password reset request right now.' },
      { status: 500 },
    )
  }
}

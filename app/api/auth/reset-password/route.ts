import { NextResponse } from 'next/server'
import { getUserNameByEmail } from '@/lib/auth'
import { consumePasswordResetToken } from '@/lib/password-reset'
import { sendPasswordChangedEmail } from '@/lib/email'
import { checkRateLimit } from '@/lib/rate-limit'
import { isSameOriginRequest } from '@/lib/request-security'

export async function POST(req: Request) {
  if (!isSameOriginRequest(req)) {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 })
  }

  try {
    const rateLimit = await checkRateLimit(req, '/api/auth/reset-password')
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests', retryAfter: rateLimit.retryAfter },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter) } },
      )
    }

    const body = await req.json().catch(() => ({}))
    const { token, password } = body
    if (!token || !password) {
      return NextResponse.json({ error: 'Token and password are required' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }
    if (password.length > 128) {
      return NextResponse.json({ error: 'Password must be at most 128 characters' }, { status: 400 })
    }

    const email = await consumePasswordResetToken(token, password)
    if (!email) {
      return NextResponse.json({ error: 'Invalid, expired, or already used reset token' }, { status: 400 })
    }

    try {
      const name = await getUserNameByEmail(email) ?? email.split('@')[0]
      await sendPasswordChangedEmail(email, name)
    } catch (err) {
      console.error('Failed to send password changed email:', err)
    }

    return NextResponse.json({ message: 'Password updated successfully' })
  } catch (err) {
    console.error('Reset password error:', err)
    const unavailable = err instanceof Error && err.message === 'Database not available'
    return NextResponse.json(
      { error: unavailable ? 'Password reset is temporarily unavailable.' : 'Something went wrong' },
      { status: unavailable ? 503 : 500 },
    )
  }
}

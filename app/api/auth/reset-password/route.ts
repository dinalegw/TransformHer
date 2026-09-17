import { NextResponse } from 'next/server'
import { updatePassword, getUserNameByEmail } from '@/lib/auth'
import { verifyPasswordResetToken } from '@/lib/password-reset'
import { sendPasswordChangedEmail } from '@/lib/email'
import { checkRateLimit } from '@/lib/rate-limit'

export async function POST(req: Request) {
  try {
    const rateLimit = await checkRateLimit(req, '/api/auth/reset-password')
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests', retryAfter: rateLimit.retryAfter },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter) } },
      )
    }

    const { token, password } = await req.json()
    if (!token || !password) {
      return NextResponse.json({ error: 'Token and password are required' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }
    if (password.length > 128) {
      return NextResponse.json({ error: 'Password must be at most 128 characters' }, { status: 400 })
    }

    const email = await verifyPasswordResetToken(token)
    if (!email) {
      return NextResponse.json({ error: 'Invalid or expired reset token' }, { status: 400 })
    }

    const updated = await updatePassword(email, password)
    if (!updated) {
      return NextResponse.json({ error: 'Password reset is temporarily unavailable.' }, { status: 503 })
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

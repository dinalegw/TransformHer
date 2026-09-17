import { NextResponse } from 'next/server'
import {
  createUser, createSession, generateEmailVerificationToken,
  validateEmail, validatePassword, validateName,
} from '@/lib/auth'
import { sendWelcomeVerificationEmail } from '@/lib/email'
import { getBaseUrl } from '@/lib/utils'
import { checkRateLimit } from '@/lib/rate-limit'

export async function POST(req: Request) {
  try {
    const rateLimit = await checkRateLimit(req, '/api/auth/register')
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests', retryAfter: rateLimit.retryAfter },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter) } },
      )
    }

    const body = await req.json()
    const { name, email, password } = body

    const nameError = validateName(name)
    if (nameError) return NextResponse.json({ error: nameError }, { status: 400 })

    const emailError = validateEmail(email)
    if (emailError) return NextResponse.json({ error: emailError }, { status: 400 })

    const passwordError = validatePassword(password)
    if (passwordError) return NextResponse.json({ error: passwordError }, { status: 400 })

    const user = await createUser(name.trim(), email, password)
    const sessionId = await createSession(user.id)
    const res = NextResponse.json({ user }, { status: 201 })
    res.cookies.set('session', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    })

    const token = generateEmailVerificationToken(user.email)
    const verifyLink = `${getBaseUrl()}/verify-email?token=${token}`

    try {
      await sendWelcomeVerificationEmail(user.email, user.name, verifyLink)
    } catch (err) {
      // Account creation/session issuance must remain successful even if Courier is unavailable.
      console.error('Failed to send welcome email:', err)
    }

    return res
  } catch (err) {
    console.error('Registration error:', err)

    if (err instanceof Error && err.message === 'An account with this email already exists') {
      return NextResponse.json({ error: err.message }, { status: 409 })
    }

    if (err instanceof Error && err.message === 'Database not available') {
      return NextResponse.json(
        { error: 'Account creation is temporarily unavailable. Please try again.' },
        { status: 503 },
      )
    }

    return NextResponse.json({ error: 'Unable to create account right now.' }, { status: 500 })
  }
}

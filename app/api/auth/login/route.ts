import { NextResponse } from 'next/server'
import { authenticateUser, createSession, validateEmail, validatePassword } from '@/lib/auth'
import { getDb } from '@/lib/db/connection'
import { sendLoginNotification } from '@/lib/email'
import { checkRateLimit } from '@/lib/rate-limit'

export async function POST(req: Request) {
  try {
    const rateLimit = await checkRateLimit(req, '/api/auth/login')
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many login attempts', retryAfter: rateLimit.retryAfter },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter) } },
      )
    }

    const body = await req.json()
    const { email, password } = body

    const emailError = validateEmail(email)
    if (emailError) return NextResponse.json({ error: emailError }, { status: 400 })

    const passwordError = validatePassword(password)
    if (passwordError) return NextResponse.json({ error: passwordError }, { status: 400 })

    // Distinguish an infrastructure outage from bad credentials so valid users
    // are not told their password is wrong when Neon is temporarily unavailable.
    const db = await getDb()
    if (!db) {
      return NextResponse.json(
        { error: 'Sign in is temporarily unavailable. Please try again.' },
        { status: 503 },
      )
    }

    const user = await authenticateUser(email, password)
    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    const sessionId = await createSession(user.id)
    const res = NextResponse.json({ user }, { status: 200 })
    res.cookies.set('session', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    })

    try {
      await sendLoginNotification(user.email, user.name)
    } catch (err) {
      // Authentication must not fail because a notification provider is unavailable.
      console.error('Failed to send login notification:', err)
    }

    return res
  } catch (err) {
    console.error('Login error:', err)

    const unavailable = err instanceof Error
      && (err.message === 'Database not available' || err.message === 'User unavailable')

    return NextResponse.json(
      { error: unavailable ? 'Sign in is temporarily unavailable. Please try again.' : 'Unable to sign in right now.' },
      { status: unavailable ? 503 : 500 },
    )
  }
}

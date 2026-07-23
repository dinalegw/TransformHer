import { NextResponse } from 'next/server'
import { authenticateUser, createSession, validateEmail, validatePassword } from '@/lib/auth'
import { sendLoginNotification } from '@/lib/email'
import { checkRateLimit } from '@/lib/rate-limit'

export async function POST(req: Request) {
  try {
    const rateLimit = checkRateLimit(req, '/api/auth/login')
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many login attempts', retryAfter: rateLimit.retryAfter },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter) } }
      )
    }

    const body = await req.json()
    const { email, password } = body

    const emailError = validateEmail(email)
    if (emailError) return NextResponse.json({ error: emailError }, { status: 400 })

    const passwordError = validatePassword(password)
    if (passwordError) return NextResponse.json({ error: passwordError }, { status: 400 })

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
      console.error('Failed to send login notification:', err)
    }

    return res
  } catch (err) {
    console.error('Login error:', err)
    const message = err instanceof Error ? err.message : 'Something went wrong'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

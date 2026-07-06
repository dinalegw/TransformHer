import { NextResponse } from 'next/server'
import {
  createUser, createSession, generateEmailVerificationToken,
  validateEmail, validatePassword, validateName,
} from '@/lib/auth'
import { sendWelcomeVerificationEmail } from '@/lib/email'
import { getBaseUrl } from '@/lib/utils'

export async function POST(req: Request) {
  try {
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
      console.error('Failed to send welcome email:', err)
    }

    return res
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Something went wrong'
    return NextResponse.json({ error: message }, { status: 409 })
  }
}

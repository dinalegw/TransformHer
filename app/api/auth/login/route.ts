import { NextResponse } from 'next/server'
import { authenticateUser, createSession, validateEmail, validatePassword } from '@/lib/auth'
import { getDb } from '@/lib/db/connection'
import { sendLoginNotification } from '@/lib/email'
import { getBlockedLoginState } from '@/lib/login-access'
import { claimNotification } from '@/lib/notification-dedupe'
import { checkRateLimit } from '@/lib/rate-limit'
import { SUPPORT_EMAIL } from '@/lib/support'

function safeLocation(req: Request): string {
  const rawCity = req.headers.get('x-vercel-ip-city')?.trim() || ''
  const country = req.headers.get('x-vercel-ip-country')?.trim() || ''
  let city = rawCity
  if (rawCity) {
    try {
      city = decodeURIComponent(rawCity)
    } catch {
      city = rawCity
    }
  }
  const parts = [city, country].filter(Boolean).map((part) => part.slice(0, 80))
  return parts.join(', ') || 'Unavailable'
}

function safeDevice(req: Request): string {
  const userAgent = req.headers.get('user-agent')?.trim()
  return userAgent ? userAgent.slice(0, 180) : 'Unknown device'
}

function isHtmlForm(req: Request): boolean {
  const contentType = req.headers.get('content-type')?.toLowerCase() || ''
  return contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')
}

function safeRedirect(value: unknown): string {
  if (typeof value !== 'string') return '/books'
  const path = value.trim()
  return path.startsWith('/') && !path.startsWith('//') ? path : '/books'
}

function formError(
  req: Request,
  message: string,
  redirect: string,
  status = 303,
  support = false,
) {
  const url = new URL('/login', req.url)
  url.searchParams.set('error', message)
  if (redirect !== '/books') url.searchParams.set('redirect', redirect)
  if (support) url.searchParams.set('support', '1')
  return NextResponse.redirect(url, status)
}

async function readBody(req: Request): Promise<{ email: unknown; password: unknown; redirect: unknown; htmlForm: boolean }> {
  const htmlForm = isHtmlForm(req)
  if (htmlForm) {
    const form = await req.formData()
    return {
      email: form.get('email'),
      password: form.get('password'),
      redirect: form.get('redirect'),
      htmlForm,
    }
  }

  const body = await req.json()
  return { email: body?.email, password: body?.password, redirect: body?.redirect, htmlForm }
}

function setSessionCookie(res: NextResponse, sessionId: string) {
  res.cookies.set('session', sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60,
    path: '/',
  })
}

function blockedMessage(state: 'frozen' | 'archived' | 'deletion_pending'): string {
  if (state === 'frozen') {
    return `Your account has been frozen. Please contact ${SUPPORT_EMAIL} so our support team can review and resolve the issue.`
  }
  if (state === 'archived') {
    return `Your account has been archived. Please contact ${SUPPORT_EMAIL} if you need the account restored or want help resolving the issue.`
  }
  return `Your account is currently unavailable. Please contact ${SUPPORT_EMAIL} for assistance.`
}

export async function POST(req: Request) {
  let htmlForm = isHtmlForm(req)
  let redirectTo = '/books'

  try {
    const rateLimit = await checkRateLimit(req, '/api/auth/login')
    if (!rateLimit.allowed) {
      if (htmlForm) return formError(req, 'Too many login attempts. Please try again shortly.', redirectTo)
      return NextResponse.json(
        { error: 'Too many login attempts', retryAfter: rateLimit.retryAfter },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter) } },
      )
    }

    const body = await readBody(req)
    htmlForm = body.htmlForm
    redirectTo = safeRedirect(body.redirect)
    const email = typeof body.email === 'string' ? body.email : ''
    const password = typeof body.password === 'string' ? body.password : ''

    const emailError = validateEmail(email)
    if (emailError) {
      return htmlForm ? formError(req, emailError, redirectTo) : NextResponse.json({ error: emailError }, { status: 400 })
    }

    const passwordError = validatePassword(password)
    if (passwordError) {
      return htmlForm ? formError(req, passwordError, redirectTo) : NextResponse.json({ error: passwordError }, { status: 400 })
    }

    const db = await getDb()
    if (!db) {
      const message = 'Sign in is temporarily unavailable. Please try again.'
      return htmlForm ? formError(req, message, redirectTo) : NextResponse.json({ error: message }, { status: 503 })
    }

    const user = await authenticateUser(email, password)
    if (!user) {
      const blocked = await getBlockedLoginState(email, password)
      if (blocked) {
        const message = blockedMessage(blocked)
        return htmlForm
          ? formError(req, message, redirectTo, 303, true)
          : NextResponse.json({ error: message, accountStatus: blocked, supportEmail: SUPPORT_EMAIL }, { status: 423 })
      }

      const message = 'Invalid email or password'
      return htmlForm ? formError(req, message, redirectTo) : NextResponse.json({ error: message }, { status: 401 })
    }

    const sessionId = await createSession(user.id)
    const res = htmlForm
      ? NextResponse.redirect(new URL(redirectTo, req.url), 303)
      : NextResponse.json({ user }, { status: 200 })
    setSessionCookie(res, sessionId)

    try {
      // A browser retry/double-submit or two horizontally-scaled functions should
      // never produce duplicate sign-in emails for the same successful login.
      const shouldSend = await claimNotification(`login:${user.id}`, 2 * 60_000)
      if (shouldSend) {
        await sendLoginNotification(user.email, user.name, safeLocation(req), safeDevice(req))
      } else {
        console.info('[auth] duplicate login notification suppressed', { userId: user.id })
      }
    } catch (err) {
      console.error('Failed to send login notification:', err)
    }

    return res
  } catch (err) {
    console.error('Login error:', err)

    const unavailable = err instanceof Error
      && (err.message === 'Database not available' || err.message === 'User unavailable')
    const message = unavailable
      ? 'Sign in is temporarily unavailable. Please try again.'
      : 'Unable to sign in right now.'

    return htmlForm
      ? formError(req, message, redirectTo)
      : NextResponse.json({ error: message }, { status: unavailable ? 503 : 500 })
  }
}

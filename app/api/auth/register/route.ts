import { NextResponse } from 'next/server'
import {
  createUser,
  generateEmailVerificationToken,
  validateEmail,
  validatePassword,
  validateName,
} from '@/lib/auth'
import { sendWelcomeVerificationEmail } from '@/lib/email'
import { getBaseUrl } from '@/lib/utils'
import { checkRateLimit } from '@/lib/rate-limit'

function isHtmlForm(req: Request): boolean {
  const contentType = req.headers.get('content-type')?.toLowerCase() || ''
  return contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')
}

async function readBody(req: Request): Promise<{ name: unknown; email: unknown; password: unknown; htmlForm: boolean }> {
  const htmlForm = isHtmlForm(req)
  if (htmlForm) {
    const form = await req.formData()
    return {
      name: form.get('name'),
      email: form.get('email'),
      password: form.get('password'),
      htmlForm,
    }
  }

  const body = await req.json()
  return { name: body?.name, email: body?.email, password: body?.password, htmlForm }
}

function formError(req: Request, message: string) {
  const url = new URL('/signup', req.url)
  url.searchParams.set('error', message)
  return NextResponse.redirect(url, 303)
}

function signupSuccess(req: Request, mailSent: boolean) {
  const url = new URL('/signup', req.url)
  url.searchParams.set('created', '1')
  url.searchParams.set('mail', mailSent ? 'sent' : 'failed')
  return NextResponse.redirect(url, 303)
}

export async function POST(req: Request) {
  let htmlForm = isHtmlForm(req)

  try {
    const rateLimit = await checkRateLimit(req, '/api/auth/register')
    if (!rateLimit.allowed) {
      if (htmlForm) return formError(req, 'Too many signup attempts. Please try again shortly.')
      return NextResponse.json(
        { error: 'Too many requests', retryAfter: rateLimit.retryAfter },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter) } },
      )
    }

    const body = await readBody(req)
    htmlForm = body.htmlForm
    const name = typeof body.name === 'string' ? body.name : ''
    const email = typeof body.email === 'string' ? body.email : ''
    const password = typeof body.password === 'string' ? body.password : ''

    const nameError = validateName(name)
    if (nameError) return htmlForm ? formError(req, nameError) : NextResponse.json({ error: nameError }, { status: 400 })

    const emailError = validateEmail(email)
    if (emailError) return htmlForm ? formError(req, emailError) : NextResponse.json({ error: emailError }, { status: 400 })

    const passwordError = validatePassword(password)
    if (passwordError) return htmlForm ? formError(req, passwordError) : NextResponse.json({ error: passwordError }, { status: 400 })

    const user = await createUser(name.trim(), email, password)

    // Account creation and authentication are intentionally separate. A new user
    // is not issued a session cookie until they explicitly sign in.
    const token = generateEmailVerificationToken(user.email)
    const verifyLink = `${getBaseUrl()}/verify-email?token=${token}`
    let verificationEmailSent = false

    try {
      await sendWelcomeVerificationEmail(user.email, user.name, verifyLink)
      verificationEmailSent = true
    } catch (err) {
      console.error('Failed to send welcome email:', err)
    }

    if (htmlForm) return signupSuccess(req, verificationEmailSent)
    return NextResponse.json({ user, verificationEmailSent }, { status: 201 })
  } catch (err) {
    console.error('Registration error:', err)

    if (err instanceof Error && err.message === 'An account with this email already exists') {
      return htmlForm ? formError(req, err.message) : NextResponse.json({ error: err.message }, { status: 409 })
    }

    if (err instanceof Error && err.message === 'Database not available') {
      const message = 'Account creation is temporarily unavailable. Please try again.'
      return htmlForm ? formError(req, message) : NextResponse.json({ error: message }, { status: 503 })
    }

    const message = 'Unable to create account right now.'
    return htmlForm ? formError(req, message) : NextResponse.json({ error: message }, { status: 500 })
  }
}

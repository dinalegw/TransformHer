import { NextResponse } from 'next/server'
import { getCurrentUser, isEmailVerified, updateUser, validateName } from '@/lib/auth'
import { getDb } from '@/lib/db/connection'
import { isSameOriginRequest } from '@/lib/request-security'
import { checkRateLimit } from '@/lib/rate-limit'

async function ensureDatabaseAvailable() {
  const db = await getDb()
  return Boolean(db)
}

export async function GET() {
  try {
    if (!(await ensureDatabaseAvailable())) {
      return NextResponse.json(
        { error: 'Account service is temporarily unavailable.' },
        { status: 503 },
      )
    }

    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ user: null }, { status: 200 })

    const emailVerified = await isEmailVerified(user.email)
    return NextResponse.json({
      user: {
        ...user,
        emailVerified,
        emailLocked: emailVerified,
      },
    })
  } catch (err) {
    console.error('[auth/me] failed to load account', err)
    return NextResponse.json(
      { error: 'Account service is temporarily unavailable.' },
      { status: 503 },
    )
  }
}

export async function PUT(req: Request) {
  try {
    if (!isSameOriginRequest(req)) {
      return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 })
    }

    const rate = await checkRateLimit(req, '/api/auth/me/update')
    if (!rate.allowed) {
      const retryAfter = rate.retryAfter ?? 60
      return NextResponse.json(
        { error: 'Too many profile updates. Please wait and try again.', retryAfter },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } },
      )
    }

    if (!(await ensureDatabaseAvailable())) {
      return NextResponse.json(
        { error: 'Account service is temporarily unavailable.' },
        { status: 503 },
      )
    }

    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'A valid JSON body is required.' }, { status: 400 })
    }

    const name = typeof body.name === 'string' ? body.name.trim() : undefined
    const username = typeof body.username === 'string' ? body.username.trim() : undefined
    const phone = typeof body.phone === 'string' ? body.phone.trim() : undefined
    const showFullName = typeof body.showFullName === 'boolean' ? body.showFullName : undefined

    if (body.name !== undefined) {
      if (name === undefined) return NextResponse.json({ error: 'Name must be text.' }, { status: 400 })
      const nameError = validateName(name)
      if (nameError) return NextResponse.json({ error: nameError }, { status: 400 })
    }

    if (body.username !== undefined) {
      if (username === undefined) return NextResponse.json({ error: 'Username must be text.' }, { status: 400 })
      if (username && !/^[A-Za-z0-9_.-]{2,40}$/.test(username)) {
        return NextResponse.json(
          { error: 'Username must be 2–40 characters using letters, numbers, dot, underscore or hyphen.' },
          { status: 400 },
        )
      }
    }

    if (body.phone !== undefined) {
      if (phone === undefined) return NextResponse.json({ error: 'Phone must be text.' }, { status: 400 })
      if (phone && (phone.length > 30 || !/^[+0-9()\s.-]+$/.test(phone))) {
        return NextResponse.json({ error: 'Enter a valid phone number.' }, { status: 400 })
      }
    }

    if (body.showFullName !== undefined && showFullName === undefined) {
      return NextResponse.json({ error: 'showFullName must be true or false.' }, { status: 400 })
    }

    // Email is intentionally not accepted by this endpoint. Verified account
    // emails are identity anchors and cannot be edited from profile settings.
    const updated = await updateUser(user.id, { name, username, phone, showFullName })
    if (!updated) {
      return NextResponse.json(
        { error: 'Account service is temporarily unavailable.' },
        { status: 503 },
      )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    const duplicate = err instanceof Error && /unique|duplicate/i.test(err.message)
    if (duplicate) {
      return NextResponse.json({ error: 'That username is already in use.' }, { status: 409 })
    }
    console.error('[auth/me] profile update failed', err)
    return NextResponse.json({ error: 'Unable to update your profile right now.' }, { status: 500 })
  }
}

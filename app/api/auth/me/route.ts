import { NextResponse } from 'next/server'
import { getCurrentUser, isEmailVerified, updateUser } from '@/lib/auth'
import { getDb } from '@/lib/db/connection'

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
    if (!(await ensureDatabaseAvailable())) {
      return NextResponse.json(
        { error: 'Account service is temporarily unavailable.' },
        { status: 503 },
      )
    }

    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { name, username, phone, showFullName } = body

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
    console.error('[auth/me] profile update failed', err)
    return NextResponse.json({ error: 'Unable to update your profile right now.' }, { status: 500 })
  }
}

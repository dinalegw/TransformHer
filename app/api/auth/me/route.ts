import { NextResponse } from 'next/server'
import { getCurrentUser, updateUser } from '@/lib/auth'
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
    return NextResponse.json({ user })
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

import { NextResponse } from 'next/server'
import { getCurrentUser, updateUser } from '@/lib/auth'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ user: null }, { status: 200 })
  return NextResponse.json({ user })
}

export async function PUT(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const { name, username, phone, showFullName } = body

    await updateUser(user.id, { name, username, phone, showFullName })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Update profile failed:', err)
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }
}

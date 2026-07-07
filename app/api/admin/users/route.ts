import { NextResponse } from 'next/server'
import { requireMasterAdmin, getUsersStore } from '@/lib/auth'

export async function GET() {
  try {
    await requireMasterAdmin()
    const store = getUsersStore()
    const users = Array.from(store.users.values()).map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      isAdmin: u.isAdmin,
      role: u.role,
      rank: u.rank,
      title: u.title,
      username: u.username,
    }))
    return NextResponse.json({ users })
  } catch (err) {
    if (err instanceof Error && err.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Admin users error:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

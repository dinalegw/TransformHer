import { NextResponse } from 'next/server'
import { requireMasterAdmin, listAllUsers } from '@/lib/auth'

export async function GET() {
  try {
    await requireMasterAdmin()
    const users = await listAllUsers()
    return NextResponse.json({ users, total: users.length })
  } catch (err) {
    if (err instanceof Error && err.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Admin users error:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

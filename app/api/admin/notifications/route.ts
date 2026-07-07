import { NextResponse } from 'next/server'
import { requireMasterAdmin } from '@/lib/auth'
import { listPendingChanges, countPendingChanges } from '@/lib/admin-books'

export async function GET() {
  try {
    await requireMasterAdmin()
    const [pending, total] = await Promise.all([
      listPendingChanges(),
      countPendingChanges(),
    ])
    return NextResponse.json({ pending, total })
  } catch (err) {
    if (err instanceof Error && err.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Notifications error:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

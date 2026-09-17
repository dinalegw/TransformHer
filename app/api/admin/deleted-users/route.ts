import { NextResponse } from 'next/server'
import { requireMasterAdmin } from '@/lib/auth'
import { listDeletedArchivesForCompliance } from '@/lib/compliance'

export async function GET() {
  try {
    const admin = await requireMasterAdmin()
    const archives = await listDeletedArchivesForCompliance(admin)
    return NextResponse.json({ archives })
  } catch (err) {
    if (err instanceof Error && err.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (err instanceof Error && err.message === 'Database not available') {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 503 })
    }
    console.error('[admin/deleted-users] failed', err)
    return NextResponse.json({ error: 'Unable to load archived accounts.' }, { status: 500 })
  }
}

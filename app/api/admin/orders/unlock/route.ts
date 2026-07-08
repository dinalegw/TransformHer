import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { releaseLibraryItem } from '@/lib/library'
import { hasPermission } from '@/lib/permissions'

export async function POST(req: Request) {
  try {
    const user = await requireAdmin()
    if (!hasPermission(user.permissions, 'unlock_books') && user.role !== 'master_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { userId, bookSlug } = await req.json()
    if (!userId || !bookSlug) {
      return NextResponse.json({ error: 'userId and bookSlug are required' }, { status: 400 })
    }

    const result = await releaseLibraryItem(userId, bookSlug)
    if (!result) {
      return NextResponse.json({ error: 'Library item not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    if (err instanceof Error && err.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Unlock error:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

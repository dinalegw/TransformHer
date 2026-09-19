import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { archiveLibraryItem } from '@/lib/library'
import { isSameOriginRequest } from '@/lib/request-security'

export async function POST(req: Request) {
  try {
    if (!isSameOriginRequest(req)) {
      return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 })
    }

    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const bookSlug = typeof body.bookSlug === 'string' ? body.bookSlug.trim() : ''
    const archived = body.archived

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(bookSlug) || bookSlug.length > 120 || typeof archived !== 'boolean') {
      return NextResponse.json({ error: 'A valid bookSlug and archived state are required' }, { status: 400 })
    }

    await archiveLibraryItem(user.id, bookSlug, archived)
    return NextResponse.json({ success: true })
  } catch (err) {
    if (err instanceof Error && err.message === 'Library item not found') {
      return NextResponse.json({ error: 'Library item not found' }, { status: 404 })
    }
    if (err instanceof Error && err.message === 'Database not available') {
      return NextResponse.json({ error: 'Library service is temporarily unavailable.' }, { status: 503 })
    }
    console.error('[library/archive] failed', err)
    return NextResponse.json({ error: 'Unable to update this library item right now.' }, { status: 500 })
  }
}

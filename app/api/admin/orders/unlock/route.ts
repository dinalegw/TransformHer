import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { releaseLibraryItem } from '@/lib/library'
import { hasPermission } from '@/lib/permissions'
import { checkRateLimit } from '@/lib/rate-limit'

export async function POST(req: Request) {
  try {
    const rate = checkRateLimit(req, '/api/admin/orders/unlock')
    if (!rate.allowed) {
      return NextResponse.json(
        { error: 'Too many requests', retryAfter: rate.retryAfter },
        { status: 429, headers: { 'Retry-After': String(rate.retryAfter) } },
      )
    }

    const origin = req.headers.get('origin')
    if (origin && new URL(origin).host !== new URL(req.url).host) {
      return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 })
    }

    const user = await requireAdmin()
    if (!hasPermission(user.permissions, 'unlock_books') && user.role !== 'master_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json().catch(() => ({}))
    const userId = typeof body.userId === 'string' ? body.userId.trim() : ''
    const bookSlug = typeof body.bookSlug === 'string' ? body.bookSlug.trim() : ''

    if (!userId || !bookSlug || userId.length > 200 || bookSlug.length > 120) {
      return NextResponse.json({ error: 'Valid userId and bookSlug are required' }, { status: 400 })
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
    return NextResponse.json({ error: 'Unable to unlock this book right now.' }, { status: 500 })
  }
}

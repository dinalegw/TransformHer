import { NextResponse } from 'next/server'
import { requireMasterAdmin } from '@/lib/auth'
import { approveChange } from '@/lib/admin-books'
import { checkRateLimit } from '@/lib/rate-limit'
import { isSameOriginRequest } from '@/lib/request-security'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    if (!isSameOriginRequest(req)) {
      return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 })
    }

    const rate = await checkRateLimit(req, '/api/admin/books/review')
    if (!rate.allowed) {
      const retryAfter = rate.retryAfter ?? 60
      return NextResponse.json(
        { error: 'Too many review actions. Please wait and try again.', retryAfter },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } },
      )
    }

    const user = await requireMasterAdmin()
    const { id } = await params
    if (!id || id.length > 200) {
      return NextResponse.json({ error: 'Invalid pending change ID' }, { status: 400 })
    }

    const change = await approveChange(id, user.email)
    return NextResponse.json({ change })
  } catch (err) {
    if (err instanceof Error && err.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (err instanceof Error && err.message === 'Pending change not found') {
      return NextResponse.json({ error: err.message }, { status: 404 })
    }
    if (err instanceof Error && err.message === 'Change already processed') {
      return NextResponse.json({ error: err.message }, { status: 409 })
    }
    if (err instanceof Error && (
      err.message === 'Book not found'
      || err.message === 'A book with this slug already exists'
      || err.message === 'Cannot update a deleted book'
      || err.message === 'Could not generate a valid slug'
    )) {
      return NextResponse.json({ error: err.message }, { status: 409 })
    }

    console.error('[admin/books/review] approve failed', err)
    return NextResponse.json({ error: 'Unable to approve this change right now.' }, { status: 500 })
  }
}

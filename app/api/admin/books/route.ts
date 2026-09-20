import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import { listAdminBooks, createAdminBook, archiveBook, submitPendingChange } from '@/lib/admin-books'
import type { Book } from '@/lib/admin-books'
import { validateBookMutation } from '@/lib/book-validation'
import { checkRateLimit } from '@/lib/rate-limit'
import { isSameOriginRequest } from '@/lib/request-security'

export async function GET() {
  try {
    await requireAdmin()
    const books = await listAdminBooks()
    return NextResponse.json({ books })
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized: admin access required') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Admin books GET error:', err)
    return NextResponse.json({ error: 'Unable to load admin books right now.' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    if (!isSameOriginRequest(req)) {
      return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 })
    }

    const rate = await checkRateLimit(req, '/api/admin/books/mutate')
    if (!rate.allowed) {
      const retryAfter = rate.retryAfter ?? 60
      return NextResponse.json(
        { error: 'Too many book changes. Please wait and try again.', retryAfter },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } },
      )
    }

    const user = await requireAdmin()
    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'A valid JSON body is required' }, { status: 400 })
    }
    const isMaster = user.role === 'master_admin'

    if (typeof body.slug === 'string' && typeof body.archived === 'boolean') {
      const slug = body.slug.trim()
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 120) {
        return NextResponse.json({ error: 'A valid book slug is required' }, { status: 400 })
      }

      if (isMaster) {
        await archiveBook(slug, body.archived)
        return NextResponse.json({ success: true })
      }
      if (!hasPermission(user.permissions, 'archive_books')) {
        return NextResponse.json({ error: 'Forbidden: you lack the archive_books permission' }, { status: 403 })
      }

      const change = await submitPendingChange(
        'archive',
        slug,
        typeof body.title === 'string' ? body.title.slice(0, 200) : 'Unknown',
        { archived: body.archived },
        user.id,
        user.email,
      )
      return NextResponse.json({ change, pending: true }, { status: 202 })
    }

    let validated
    try {
      validated = validateBookMutation(body)
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : 'Invalid book data' },
        { status: 400 },
      )
    }

    if (!isMaster) {
      if (!hasPermission(user.permissions, 'create_books')) {
        return NextResponse.json({ error: 'Forbidden: you lack the create_books permission' }, { status: 403 })
      }
      const change = await submitPendingChange(
        'create',
        validated.slug || '',
        validated.title || 'Untitled',
        validated as Partial<Book>,
        user.id,
        user.email,
      )
      return NextResponse.json({ change, pending: true }, { status: 202 })
    }

    const book = await createAdminBook(validated as Parameters<typeof createAdminBook>[0])
    return NextResponse.json({ book }, { status: 201 })
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized: admin access required') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (err instanceof Error && err.message === 'A book with this slug already exists') {
      return NextResponse.json({ error: err.message }, { status: 409 })
    }
    if (err instanceof Error && err.message === 'Book not found') {
      return NextResponse.json({ error: err.message }, { status: 404 })
    }
    console.error('Admin books POST error:', err)
    return NextResponse.json({ error: 'Unable to create or update this book right now.' }, { status: 500 })
  }
}

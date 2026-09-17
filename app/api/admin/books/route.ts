import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import { listAdminBooks, createAdminBook, archiveBook, submitPendingChange } from '@/lib/admin-books'
import type { Book } from '@/lib/admin-books'
import { validateBookMutation } from '@/lib/book-validation'

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
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireAdmin()
    const body = await req.json()
    const isMaster = user.role === 'master_admin'

    // Handle archive toggle separately from book creation.
    if (body.slug && typeof body.archived === 'boolean') {
      if (typeof body.slug !== 'string' || !body.slug.trim()) {
        return NextResponse.json({ error: 'A valid book slug is required' }, { status: 400 })
      }

      if (isMaster) {
        await archiveBook(body.slug, body.archived)
        return NextResponse.json({ success: true })
      }
      if (!hasPermission(user.permissions, 'archive_books')) {
        return NextResponse.json({ error: 'Forbidden: you lack the archive_books permission' }, { status: 403 })
      }
      const change = await submitPendingChange(
        'archive', body.slug, typeof body.title === 'string' ? body.title : 'Unknown',
        { archived: body.archived }, user.id, user.email,
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
        'create', validated.slug || '', validated.title || 'Untitled',
        validated as Partial<Book>, user.id, user.email,
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
    console.error('Admin books POST error:', err)
    return NextResponse.json({ error: 'Unable to create this book right now.' }, { status: 500 })
  }
}

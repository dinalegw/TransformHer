import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import { listAdminBooks, createAdminBook, archiveBook, submitPendingChange } from '@/lib/admin-books'
import type { Book } from '@/lib/admin-books'

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

    // Handle archive toggle
    if (body.slug && typeof body.archived === 'boolean') {
      if (isMaster) {
        await archiveBook(body.slug, body.archived)
        return NextResponse.json({ success: true })
      }
      if (!hasPermission(user.permissions, 'archive_books')) {
        return NextResponse.json({ error: 'Forbidden: you lack the archive_books permission' }, { status: 403 })
      }
      const change = await submitPendingChange(
        'archive', body.slug, body.title || 'Unknown',
        { archived: body.archived }, user.id, user.email,
      )
      return NextResponse.json({ change, pending: true }, { status: 202 })
    }

    // Create
    if (!body.title || !body.author || !body.category || !body.price || !body.coverImage) {
      return NextResponse.json(
        { error: 'Missing required fields: title, author, category, price, coverImage' },
        { status: 400 },
      )
    }

    if (!isMaster) {
      if (!hasPermission(user.permissions, 'create_books')) {
        return NextResponse.json({ error: 'Forbidden: you lack the create_books permission' }, { status: 403 })
      }
      const change = await submitPendingChange(
        'create', body.slug || '', body.title,
        body as Partial<Book>, user.id, user.email,
      )
      return NextResponse.json({ change, pending: true }, { status: 202 })
    }

    const book = await createAdminBook(body)
    return NextResponse.json({ book }, { status: 201 })
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized: admin access required') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const message = err instanceof Error ? err.message : 'Something went wrong'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

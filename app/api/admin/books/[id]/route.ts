import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { requireAdmin } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import { getDb } from '@/lib/db/connection'
import { books } from '@/lib/db/schema'
import {
  getAdminBook, updateAdminBook, deleteAdminBook, deleteBookBySlug,
  submitPendingChange,
} from '@/lib/admin-books'
import type { Book } from '@/lib/admin-books'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin()
    const { id } = await params
    const bookId = Number(id)
    if (isNaN(bookId)) {
      return NextResponse.json({ error: 'Invalid book ID' }, { status: 400 })
    }
    const book = await getAdminBook(bookId)
    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 })
    }
    return NextResponse.json({ book })
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized: admin access required') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Admin book GET error:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAdmin()
    const { id } = await params
    const bookId = Number(id)
    if (isNaN(bookId)) {
      return NextResponse.json({ error: 'Invalid book ID' }, { status: 400 })
    }
    const body = await req.json()
    const isMaster = user.role === 'master_admin'

    if (!isMaster) {
      if (!hasPermission(user.permissions, 'edit_books')) {
        return NextResponse.json({ error: 'Forbidden: you lack the edit_books permission' }, { status: 403 })
      }
      const existing = await getAdminBook(bookId)
      if (!existing) {
        return NextResponse.json({ error: 'Book not found' }, { status: 404 })
      }
      const change = await submitPendingChange(
        'update', existing.slug, existing.title,
        body as Partial<Book>, user.id, user.email,
      )
      return NextResponse.json({ change, pending: true }, { status: 202 })
    }

    const book = await updateAdminBook(bookId, body)
    return NextResponse.json({ book })
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized: admin access required') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const message = err instanceof Error ? err.message : 'Something went wrong'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAdmin()
    const { id } = await params
    const isMaster = user.role === 'master_admin'

    if (!isMaster) {
      if (!hasPermission(user.permissions, 'delete_books')) {
        return NextResponse.json({ error: 'Forbidden: you lack the delete_books permission' }, { status: 403 })
      }

      const { searchParams } = new URL(req.url)
      const slugParam = searchParams.get('slug')
      const bookId = Number(id)

      let book: Book | undefined
      if (slugParam) {
      const db = await getDb()
      if (db) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Dual DB support (PostgreSQL + SQLite fallback)
        const rows = await (db as any).select().from(books).where(eq(books.slug, slugParam)).limit(1)
          book = rows[0] as Book | undefined
        }
      } else if (!isNaN(bookId)) {
        book = await getAdminBook(bookId)
      }

      if (!book) {
        return NextResponse.json({ error: 'Book not found' }, { status: 404 })
      }

      const change = await submitPendingChange(
        'delete', book.slug, book.title,
        {}, user.id, user.email,
      )
      return NextResponse.json({ change, pending: true }, { status: 202 })
    }

    // Master: direct delete
    const { searchParams } = new URL(req.url)
    const source = searchParams.get('source')

    if (source === 'seed') {
      const slug = searchParams.get('slug')
      if (!slug) {
        return NextResponse.json({ error: 'slug is required for seed book deletion' }, { status: 400 })
      }
      await deleteBookBySlug(slug)
    } else {
      const bookId = Number(id)
      if (isNaN(bookId)) {
        const slug = searchParams.get('slug')
        if (slug) {
          await deleteBookBySlug(slug)
        } else {
          return NextResponse.json({ error: 'Invalid book ID' }, { status: 400 })
        }
      } else {
        await deleteAdminBook(bookId)
      }
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized: admin access required') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const message = err instanceof Error ? err.message : 'Something went wrong'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

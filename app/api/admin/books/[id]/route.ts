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
import { validateBookMutation } from '@/lib/book-validation'
import { checkRateLimit } from '@/lib/rate-limit'
import { isSameOriginRequest } from '@/lib/request-security'

function validBookId(raw: string): number | null {
  const value = Number(raw)
  return Number.isSafeInteger(value) && value > 0 ? value : null
}

function validSlug(raw: string | null): string | null {
  if (!raw) return null
  const slug = raw.trim()
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length <= 120 ? slug : null
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin()
    const { id } = await params
    const bookId = validBookId(id)
    if (!bookId) return NextResponse.json({ error: 'Invalid book ID' }, { status: 400 })

    const book = await getAdminBook(bookId)
    if (!book) return NextResponse.json({ error: 'Book not found' }, { status: 404 })
    return NextResponse.json({ book })
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized: admin access required') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Admin book GET error:', err)
    return NextResponse.json({ error: 'Unable to load this book right now.' }, { status: 500 })
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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
    const { id } = await params
    const bookId = validBookId(id)
    if (!bookId) return NextResponse.json({ error: 'Invalid book ID' }, { status: 400 })

    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'A valid JSON body is required' }, { status: 400 })
    }

    let validated
    try {
      validated = validateBookMutation(body, { partial: true })
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : 'Invalid book data' },
        { status: 400 },
      )
    }

    if (Object.keys(validated).length === 0) {
      return NextResponse.json({ error: 'No supported book fields were provided' }, { status: 400 })
    }

    const isMaster = user.role === 'master_admin'
    if (!isMaster) {
      if (!hasPermission(user.permissions, 'edit_books')) {
        return NextResponse.json({ error: 'Forbidden: you lack the edit_books permission' }, { status: 403 })
      }

      const existing = await getAdminBook(bookId)
      if (!existing) return NextResponse.json({ error: 'Book not found' }, { status: 404 })

      const change = await submitPendingChange(
        'update',
        existing.slug,
        existing.title,
        validated as Partial<Book>,
        user.id,
        user.email,
      )
      return NextResponse.json({ change, pending: true }, { status: 202 })
    }

    const book = await updateAdminBook(bookId, validated)
    return NextResponse.json({ book })
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized: admin access required') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (err instanceof Error && err.message === 'Book not found') {
      return NextResponse.json({ error: err.message }, { status: 404 })
    }
    if (err instanceof Error && err.message === 'A book with this slug already exists') {
      return NextResponse.json({ error: err.message }, { status: 409 })
    }
    console.error('Admin book PUT error:', err)
    return NextResponse.json({ error: 'Unable to update this book right now.' }, { status: 500 })
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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
    const { id } = await params
    const isMaster = user.role === 'master_admin'
    const { searchParams } = new URL(req.url)
    const slugParam = validSlug(searchParams.get('slug'))

    if (!isMaster) {
      if (!hasPermission(user.permissions, 'delete_books')) {
        return NextResponse.json({ error: 'Forbidden: you lack the delete_books permission' }, { status: 403 })
      }

      const bookId = validBookId(id)
      let book: Book | undefined

      if (searchParams.has('slug')) {
        if (!slugParam) return NextResponse.json({ error: 'Invalid book slug' }, { status: 400 })
        const db = await getDb()
        if (!db) return NextResponse.json({ error: 'Database unavailable' }, { status: 503 })
        const rows = await db.select().from(books).where(eq(books.slug, slugParam)).limit(1)
        book = rows[0] as Book | undefined
      } else if (bookId) {
        book = await getAdminBook(bookId)
      }

      if (!book) return NextResponse.json({ error: 'Book not found' }, { status: 404 })

      const change = await submitPendingChange(
        'delete',
        book.slug,
        book.title,
        {},
        user.id,
        user.email,
      )
      return NextResponse.json({ change, pending: true }, { status: 202 })
    }

    const source = searchParams.get('source')
    if (source && source !== 'seed' && source !== 'admin') {
      return NextResponse.json({ error: 'Invalid book source' }, { status: 400 })
    }

    if (source === 'seed') {
      if (!slugParam) {
        return NextResponse.json({ error: 'A valid slug is required for seed book deletion' }, { status: 400 })
      }
      await deleteBookBySlug(slugParam)
    } else {
      const bookId = validBookId(id)
      if (bookId) {
        await deleteAdminBook(bookId)
      } else if (slugParam) {
        await deleteBookBySlug(slugParam)
      } else {
        return NextResponse.json({ error: 'Invalid book ID' }, { status: 400 })
      }
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    if (err instanceof Error && err.message === 'Unauthorized: admin access required') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (err instanceof Error && err.message === 'Book not found') {
      return NextResponse.json({ error: err.message }, { status: 404 })
    }
    console.error('Admin book DELETE error:', err)
    return NextResponse.json({ error: 'Unable to delete this book right now.' }, { status: 500 })
  }
}

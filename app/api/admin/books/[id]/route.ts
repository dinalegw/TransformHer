import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getAdminBook, updateAdminBook, deleteAdminBook, deleteBookBySlug } from '@/lib/admin-books'

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
    await requireAdmin()
    const { id } = await params
    const bookId = Number(id)
    if (isNaN(bookId)) {
      return NextResponse.json({ error: 'Invalid book ID' }, { status: 400 })
    }
    const body = await req.json()
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
    await requireAdmin()
    const { id } = await params
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
        // Try slug-based deletion
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

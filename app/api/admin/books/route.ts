import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { listAdminBooks, createAdminBook, getAllMergedBooks } from '@/lib/admin-books'

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
    await requireAdmin()
    const body = await req.json()

    if (!body.title || !body.author || !body.category || !body.price || !body.coverImage) {
      return NextResponse.json(
        { error: 'Missing required fields: title, author, category, price, coverImage' },
        { status: 400 },
      )
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

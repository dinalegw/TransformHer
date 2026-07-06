import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { fetchLibrary, getLibraryItem, addToLibrary, removeFromLibrary } from '@/lib/library'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const library = await fetchLibrary(user.id)
  return NextResponse.json(library)
}

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const bookId = Number(body.bookId)
    const { bookSlug } = body
    if (!bookId || !bookSlug) {
      return NextResponse.json({ error: 'bookId and bookSlug are required' }, { status: 400 })
    }

    const existing = await getLibraryItem(user.id, bookId)
    if (existing) {
      return NextResponse.json({ error: 'Book already in your library' }, { status: 409 })
    }

    await addToLibrary(user.id, bookId, bookSlug)
    return NextResponse.json({ success: true }, { status: 201 })
  } catch (err) {
    console.error('Add to library failed:', err)
    return NextResponse.json({ error: 'Failed to add to library' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { bookId: rawId } = await req.json()
    const bookId = Number(rawId)
    if (!bookId) {
      return NextResponse.json({ error: 'bookId is required' }, { status: 400 })
    }

    await removeFromLibrary(user.id, bookId)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Remove from library failed:', err)
    return NextResponse.json({ error: 'Failed to remove from library' }, { status: 500 })
  }
}

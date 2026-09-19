import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { fetchCart, getCartItem, addToCart, removeFromCart, getLibraryItem } from '@/lib/library'
import { isSameOriginRequest } from '@/lib/request-security'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const items = await fetchCart(user.id)
  return NextResponse.json({ items })
}

export async function POST(req: Request) {
  if (!isSameOriginRequest(req)) {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 })
  }

  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (user.role === 'master_admin') {
    return NextResponse.json({ error: 'Master admin already has access to all books' }, { status: 400 })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const bookId = Number(body.bookId)
    if (!Number.isSafeInteger(bookId) || bookId <= 0) {
      return NextResponse.json({ error: 'A valid bookId is required' }, { status: 400 })
    }

    const owned = await getLibraryItem(user.id, bookId)
    if (owned) {
      return NextResponse.json({ error: 'You already own this book' }, { status: 409 })
    }

    const existing = await getCartItem(user.id, bookId)
    if (existing) {
      return NextResponse.json({ error: 'Book already in cart' }, { status: 409 })
    }

    await addToCart(user.id, bookId)
    return NextResponse.json({ success: true }, { status: 201 })
  } catch (err) {
    console.error('Add to cart failed:', err)
    return NextResponse.json({ error: 'Failed to add to cart' }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  if (!isSameOriginRequest(req)) {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 })
  }

  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json().catch(() => ({}))
    const bookId = Number(body.bookId)
    if (!Number.isSafeInteger(bookId) || bookId <= 0) {
      return NextResponse.json({ error: 'A valid bookId is required' }, { status: 400 })
    }

    await removeFromCart(user.id, bookId)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Remove from cart failed:', err)
    return NextResponse.json({ error: 'Failed to remove from cart' }, { status: 500 })
  }
}

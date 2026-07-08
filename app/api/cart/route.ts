import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { fetchCart, getCartItem, addToCart, removeFromCart, getLibraryItem } from '@/lib/library'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const items = await fetchCart(user.id)
  return NextResponse.json({ items })
}

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (user.role === 'master_admin') {
    return NextResponse.json({ error: 'Master admin already has access to all books' }, { status: 400 })
  }

  try {
    const { bookId: rawId } = await req.json()
    const bookId = Number(rawId)
    if (!bookId) {
      return NextResponse.json({ error: 'bookId is required' }, { status: 400 })
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
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { bookId: rawId } = await req.json()
    const bookId = Number(rawId)
    if (!bookId) {
      return NextResponse.json({ error: 'bookId is required' }, { status: 400 })
    }

    await removeFromCart(user.id, bookId)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Remove from cart failed:', err)
    return NextResponse.json({ error: 'Failed to remove from cart' }, { status: 500 })
  }
}

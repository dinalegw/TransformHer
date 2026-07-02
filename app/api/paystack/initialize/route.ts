import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { initializePaystackPayment } from '@/lib/paystack'
import { getBookBySlug } from '@/lib/books'

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { bookSlug } = await req.json()
  if (!bookSlug) return NextResponse.json({ error: 'bookSlug is required' }, { status: 400 })

  const book = await getBookBySlug(bookSlug)
  if (!book) return NextResponse.json({ error: 'Book not found' }, { status: 404 })

  const reference = `TX-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`
  const result = await initializePaystackPayment({
    email: user.email,
    amount: Number(book.price),
    reference,
    metadata: { userId: user.id, bookSlug, bookTitle: book.title },
  })

  return NextResponse.json(result)
}

import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { verifyPaystackPayment } from '@/lib/paystack'
import { recordPurchase, removeFromCart, fetchCart } from '@/lib/library'
import { getAllMergedBooks } from '@/lib/admin-books'
import { sendPurchaseConfirmation, sendAdminOrderNotification } from '@/lib/email'
import { formatPrice } from '@/lib/format'

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { reference } = await req.json()
    if (!reference) return NextResponse.json({ error: 'reference is required' }, { status: 400 })

    const result = await verifyPaystackPayment(reference)

    if (!result.status || result.data?.status !== 'success') {
      return NextResponse.json({ error: 'Payment verification failed' }, { status: 402 })
    }

    const ref = result.data.reference as string
    const customerEmail = result.data.customer?.email as string | undefined
    const customerName = result.data.customer?.first_name
      ? `${result.data.customer.first_name} ${result.data.customer.last_name ?? ''}`.trim()
      : user.name ?? 'Valued Customer'
    const amount = formatPrice(Number(result.data.amount) / 100, result.data.currency ?? 'NGN')

    const [items, allBooks] = await Promise.all([
      fetchCart(user.id),
      getAllMergedBooks(),
    ])

    if (items.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 })
    }

    const bookMap = new Map(allBooks.map(b => [b.id, b]))

    // Verify the amount Paystack actually collected matches the cart total.
    const verifiedKobo = Number(result.data.amount)
    const expectedKobo = items.reduce((sum, item) => {
      const book = bookMap.get(item.bookId)
      return book ? sum + Math.round(Number(book.price) * 100) : sum
    }, 0)
    if (Math.abs(verifiedKobo - expectedKobo) > 0) {
      return NextResponse.json({ error: 'Payment amount mismatch' }, { status: 402 })
    }

    const errors: string[] = []
    for (const item of items) {
      try {
        const book = bookMap.get(item.bookId)
        if (!book) {
          // Book was deleted/archived between checkout start and confirm.
          errors.push(`Book ${item.bookId}: no longer available`)
          await removeFromCart(user.id, item.bookId)
          continue
        }
        await recordPurchase(user.id, item.bookId, book.slug, ref)
        await removeFromCart(user.id, item.bookId)
      } catch (e) {
        errors.push(`Book ${item.bookId}: ${(e as Error).message}`)
      }
    }

    const purchasedBooks = items
      .map(i => bookMap.get(i.bookId))
      .filter((b): b is NonNullable<typeof b> => b != null)

    const emailTo = customerEmail ?? user.email
    try {
      if (purchasedBooks.length === 1) {
        await sendPurchaseConfirmation(emailTo, customerName, purchasedBooks[0].title, amount)
      } else {
        await sendPurchaseConfirmation(emailTo, customerName, `${purchasedBooks.length} books`, amount)
      }
    } catch (e) {
      console.error('Failed to send purchase confirmation:', e)
    }

    const adminEmail = process.env.ADMIN_EMAIL
    if (adminEmail && emailTo) {
      try {
        const titles = purchasedBooks.map(b => b.title).join(', ')
        await sendAdminOrderNotification(adminEmail, emailTo, customerName, titles, amount)
      } catch (e) {
        console.error('Failed to send admin notification:', e)
      }
    }

    return NextResponse.json({ success: true, bookSlugs: purchasedBooks.map(b => b.slug) })
  } catch (err) {
    console.error('Checkout confirm failed:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

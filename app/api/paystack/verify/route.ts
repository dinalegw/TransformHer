import { NextResponse } from 'next/server'
import { verifyPaystackPayment } from '@/lib/paystack'
import { sendPurchaseConfirmation, sendAdminOrderNotification } from '@/lib/email'
import { getBookBySlug } from '@/lib/books'
import { formatPrice } from '@/lib/format'

export async function POST(req: Request) {
  try {
    const { reference } = await req.json()
    if (!reference) return NextResponse.json({ error: 'reference is required' }, { status: 400 })

    const result = await verifyPaystackPayment(reference)

    if (result.status && result.data?.metadata) {
      const { bookTitle, bookSlug } = result.data.metadata
      const customerEmail = result.data.customer?.email ?? ''
      const amount = formatPrice(Number(result.data.amount) / 100, result.data.currency ?? 'NGN')

      const book = bookSlug ? await getBookBySlug(bookSlug) : null

      if (customerEmail) {
        const customerName = result.data.customer?.first_name
          ? `${result.data.customer.first_name} ${result.data.customer.last_name ?? ''}`.trim()
          : 'Valued Customer'
        await sendPurchaseConfirmation(customerEmail, customerName, bookTitle ?? 'your book', amount)
      }

      const adminEmail = process.env.ADMIN_EMAIL
      if (adminEmail && customerEmail) {
        await sendAdminOrderNotification(
          adminEmail,
          customerEmail,
          result.data.customer?.first_name
            ? `${result.data.customer.first_name} ${result.data.customer.last_name ?? ''}`.trim()
            : 'Customer',
          bookTitle ?? 'a book',
          amount,
        )
      }
    }

    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

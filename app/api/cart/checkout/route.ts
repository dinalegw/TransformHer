import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { fetchCart, checkoutCart } from '@/lib/library'

export async function POST() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const items = await fetchCart(user.id)
    if (items.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 })
    }

    await checkoutCart(user.id)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Checkout failed:', err)
    return NextResponse.json({ error: 'Checkout failed' }, { status: 500 })
  }
}

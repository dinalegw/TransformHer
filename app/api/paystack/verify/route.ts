import { NextResponse } from 'next/server'
import { verifyPaystackPayment } from '@/lib/paystack'

export async function POST(req: Request) {
  const { reference } = await req.json()
  if (!reference) return NextResponse.json({ error: 'reference is required' }, { status: 400 })

  const result = await verifyPaystackPayment(reference)
  return NextResponse.json(result)
}

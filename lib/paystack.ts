import { getBaseUrl } from '@/lib/utils'

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY ?? ''
const BASE = 'https://api.paystack.co'

export async function initializePaystackPayment(params: {
  email: string
  amount: number
  reference: string
  callback_url?: string
  metadata?: Record<string, unknown>
}) {
  const res = await fetch(`${BASE}/transaction/initialize`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: params.email,
      amount: Math.round(params.amount * 100),
      reference: params.reference,
      metadata: params.metadata,
      currency: 'NGN',
      callback_url: params.callback_url ?? `${getBaseUrl()}/books?purchased=true`,
    }),
  })
  return res.json()
}

export async function verifyPaystackPayment(reference: string) {
  const res = await fetch(`${BASE}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` },
  })
  return res.json()
}

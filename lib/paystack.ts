const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY ?? 'sk_test_sample'
const BASE = 'https://api.paystack.co'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'

export async function initializePaystackPayment(params: {
  email: string
  amount: number
  reference: string
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
      callback_url: `${BASE_URL}/books/${params.metadata?.bookSlug ?? ''}?purchased=true`,
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

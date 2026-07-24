import { getBaseUrl } from '@/lib/utils'

const BASE = 'https://api.paystack.co'

export interface PaystackTransactionMetadata {
  userId?: string
  bookSlug?: string
  bookTitle?: string
  bookIds?: string[]
  bookSlugs?: string[]
  cartCheckout?: boolean
}

export interface PaystackCustomer {
  email?: string
  first_name?: string
  last_name?: string
}

export interface PaystackInitializeResponse {
  status: boolean
  message?: string
  data?: {
    authorization_url?: string
    reference?: string
  }
}

export interface PaystackVerifyResponse {
  status: boolean
  message?: string
  data?: {
    status?: string
    reference?: string
    amount?: number | string
    currency?: string
    customer?: PaystackCustomer
    metadata?: PaystackTransactionMetadata
  }
}

function getPaystackSecret(): string {
  const secret = process.env.PAYSTACK_SECRET_KEY?.trim()
  if (!secret) {
    throw new Error('[paystack] PAYSTACK_SECRET_KEY is not configured')
  }
  return secret
}

async function getJsonOrThrow<T>(res: Response): Promise<T> {
  if (!res.ok) {
    throw new Error(`[paystack] HTTP ${res.status}`)
  }

  return (await res.json()) as T
}

export async function initializePaystackPayment(params: {
  email: string
  amount: number
  reference: string
  callback_url?: string
  metadata?: Record<string, unknown>
}): Promise<PaystackInitializeResponse> {
  const secret = getPaystackSecret()
  const res = await fetch(`${BASE}/transaction/initialize`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secret}`,
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

  return await getJsonOrThrow<PaystackInitializeResponse>(res)
}

export async function verifyPaystackPayment(reference: string): Promise<PaystackVerifyResponse> {
  const secret = getPaystackSecret()
  const res = await fetch(`${BASE}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${secret}` },
  })

  return await getJsonOrThrow<PaystackVerifyResponse>(res)
}

import { NextResponse } from 'next/server'

const REQUIRED_VARS = [
  'AUTH_SECRET',
  'NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY',
  'PAYSTACK_SECRET_KEY',
  'COURIER_API_KEY',
  'COURIER_TEMPLATE_PASSWORD_RESET',
  'COURIER_TEMPLATE_WELCOME_VERIFY',
  'COURIER_TEMPLATE_EMAIL_VERIFIED',
  'COURIER_TEMPLATE_ORDER_CONFIRMATION',
  'COURIER_TEMPLATE_BOOK_RELEASED',
  'COURIER_TEMPLATE_ADMIN_ORDER',
  'ADMIN_EMAIL',
]

const OPTIONAL_VARS = [
  'NEXT_PUBLIC_BASE_URL',
]

export async function GET() {
  const checks: Record<string, { set: boolean; note?: string }> = {}

  for (const key of REQUIRED_VARS) {
    const val = process.env[key]
    checks[key] = { set: !!val }
    if (!val) {
      checks[key].note = 'MISSING — add this in Vercel Dashboard'
    }
  }

  for (const key of OPTIONAL_VARS) {
    const val = process.env[key]
    checks[key] = { set: !!val }
    if (!val) {
      checks[key].note = 'not set — will use VERCEL_URL fallback'
    }
  }

  checks['VERCEL_URL'] = { set: !!process.env.VERCEL_URL }

  const allSet = REQUIRED_VARS.every(k => process.env[k])

  return NextResponse.json({
    status: allSet ? 'ok' : 'missing_vars',
    checks,
  })
}

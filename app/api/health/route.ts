import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db/connection'

const REQUIRED_VARS = [
  'AUTH_SECRET',
  'NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY',
  'PAYSTACK_SECRET_KEY',
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
  'BLOB_READ_WRITE_TOKEN',
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

  checks.COURIER_API_KEY = {
    set: !!process.env.COURIER_API_KEY,
    note: process.env.COURIER_API_KEY ? undefined : 'MISSING — set COURIER_API_KEY',
  }

  for (const key of OPTIONAL_VARS) {
    const val = process.env[key]
    checks[key] = { set: !!val }
    if (!val) {
      checks[key].note = 'not set — will use fallback behavior'
    }
  }

  checks['VERCEL_URL'] = { set: !!process.env.VERCEL_URL }

  // This reports connectivity only—never database credentials or data.
  const db = await getDb()
  checks.DATABASE = {
    set: !!db,
    note: db ? undefined : 'unavailable — add a Postgres connection URL and run migrations',
  }

  const allSet = requiredEnvCheck()

  return NextResponse.json({
    status: allSet ? 'ok' : 'missing_vars',
    checks,
  })
}

function requiredEnvCheck(): boolean {
  return REQUIRED_VARS.every(k => process.env[k])
    && !!process.env.COURIER_API_KEY
}

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

export const dynamic = 'force-dynamic'

export async function GET() {
  const checks: Record<string, { set: boolean; note?: string }> = {}

  for (const key of REQUIRED_VARS) {
    const val = process.env[key]
    checks[key] = { set: Boolean(val) }
    if (!val) checks[key].note = 'MISSING — add this to the Production environment'
  }

  checks.COURIER_API_KEY = {
    set: Boolean(process.env.COURIER_API_KEY),
    note: process.env.COURIER_API_KEY ? undefined : 'MISSING — Courier email cannot send',
  }

  checks.COURIER_TEMPLATE_LOGIN_NOTIFICATION = {
    set: Boolean(process.env.COURIER_TEMPLATE_LOGIN_NOTIFICATION),
    note: process.env.COURIER_TEMPLATE_LOGIN_NOTIFICATION
      ? undefined
      : 'not set — login notifications use the Courier inline fallback',
  }

  checks.NEXT_PUBLIC_BASE_URL = {
    set: Boolean(process.env.NEXT_PUBLIC_BASE_URL),
    note: process.env.NEXT_PUBLIC_BASE_URL
      ? undefined
      : 'not set — deployment URL fallback is used',
  }

  checks.BLOB_READ_WRITE_TOKEN = {
    set: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
    note: process.env.BLOB_READ_WRITE_TOKEN
      ? undefined
      : 'MISSING — production admin book uploads are disabled until persistent Blob storage is connected',
  }

  checks.VERCEL_URL = { set: Boolean(process.env.VERCEL_URL) }

  // Connectivity only. Never return credentials or database data.
  const db = await getDb()
  checks.DATABASE = {
    set: Boolean(db),
    note: db ? undefined : 'database unavailable',
  }

  const coreReady = REQUIRED_VARS.every((key) => process.env[key])
    && Boolean(process.env.COURIER_API_KEY)
    && Boolean(db)
  const storageReady = Boolean(process.env.BLOB_READ_WRITE_TOKEN)

  return NextResponse.json({
    status: coreReady ? (storageReady ? 'ok' : 'degraded') : 'error',
    coreReady,
    storageReady,
    checks,
  }, {
    status: coreReady ? 200 : 503,
    headers: { 'Cache-Control': 'no-store' },
  })
}

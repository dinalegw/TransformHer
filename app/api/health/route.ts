import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getDb } from '@/lib/db/connection'
import { getCourierTemplateId } from '@/lib/email'
import { getBaseUrl } from '@/lib/utils'
import { SCALING_POLICY, getDatabaseConnection, getDbPoolMaxPerInstance } from '@/lib/scaling'

const REQUIRED_CONFIG_VARS = [
  'AUTH_SECRET',
  'NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY',
  'PAYSTACK_SECRET_KEY',
  'ADMIN_EMAIL',
] as const

const REQUIRED_EMAIL_TEMPLATES = [
  'COURIER_TEMPLATE_PASSWORD_RESET',
  'COURIER_TEMPLATE_PASSWORD_RESET_CONFIRMATION',
  'COURIER_TEMPLATE_PASSWORD_CHANGED',
  'COURIER_TEMPLATE_WELCOME_VERIFY',
  'COURIER_TEMPLATE_EMAIL_VERIFICATION_CODE',
  'COURIER_TEMPLATE_EMAIL_VERIFIED',
  'COURIER_TEMPLATE_VERIFY_NEW_EMAIL',
  'COURIER_TEMPLATE_LOGIN_NOTIFICATION',
  'COURIER_TEMPLATE_SECURITY_ALERT',
  'COURIER_TEMPLATE_INVITATION',
  'COURIER_TEMPLATE_ACCOUNT_FROZEN',
  'COURIER_TEMPLATE_ACCOUNT_ARCHIVED',
  'COURIER_TEMPLATE_ACCOUNT_UNFROZEN',
  'COURIER_TEMPLATE_ACCOUNT_UNARCHIVED',
  'COURIER_TEMPLATE_ORDER_CONFIRMATION',
  'COURIER_TEMPLATE_BOOK_RELEASED',
  'COURIER_TEMPLATE_ADMIN_ORDER',
] as const

export const dynamic = 'force-dynamic'

function templateReady(key: string): boolean {
  try {
    return Boolean(getCourierTemplateId(key))
  } catch {
    return false
  }
}

export async function GET() {
  const publicBaseUrl = getBaseUrl()
  const db = await getDb()
  const databaseConnection = getDatabaseConnection()
  const scalingReady = Boolean(db) && databaseConnection.pooledPreferred
  const mailReady = Boolean(process.env.COURIER_API_KEY)
    && REQUIRED_EMAIL_TEMPLATES.every((key) => templateReady(key))
  const coreReady = REQUIRED_CONFIG_VARS.every((key) => Boolean(process.env[key]))
    && mailReady
    && Boolean(db)
  const storageReady = Boolean(process.env.BLOB_READ_WRITE_TOKEN)
  const status = coreReady ? (storageReady && scalingReady ? 'ok' : 'degraded') : 'error'

  // Public health output intentionally exposes readiness only. Detailed
  // environment/template/database diagnostics are operational metadata and are
  // returned only to an authenticated Master Admin.
  let masterAdmin = false
  try {
    masterAdmin = (await getCurrentUser())?.role === 'master_admin'
  } catch {
    masterAdmin = false
  }

  const base = {
    status,
    coreReady,
    mailReady,
    storageReady,
    scalingReady,
    publicBaseUrl,
  }

  if (!masterAdmin) {
    return NextResponse.json(base, {
      status: coreReady ? 200 : 503,
      headers: { 'Cache-Control': 'no-store' },
    })
  }

  const checks: Record<string, { set: boolean; note?: string }> = {}
  for (const key of REQUIRED_CONFIG_VARS) {
    const val = process.env[key]
    checks[key] = {
      set: Boolean(val),
      note: val ? undefined : 'MISSING — add this to the Production environment',
    }
  }

  checks.COURIER_API_KEY = {
    set: Boolean(process.env.COURIER_API_KEY),
    note: process.env.COURIER_API_KEY ? undefined : 'MISSING — Courier email cannot send',
  }

  for (const key of REQUIRED_EMAIL_TEMPLATES) {
    const ready = templateReady(key)
    checks[key] = {
      set: ready,
      note: ready
        ? (process.env[key] ? 'resolved from configured/verified template' : 'resolved from verified Courier build manifest')
        : 'MISSING — no verified Courier template is available',
    }
  }

  checks.TRANSFORMHER_PUBLIC_URL = {
    set: publicBaseUrl === 'https://transformher.vercel.app' || Boolean(process.env.TRANSFORMHER_PUBLIC_URL),
    note: `customer-facing links resolve to ${publicBaseUrl}`,
  }
  checks.NEXT_PUBLIC_BASE_URL = {
    set: Boolean(process.env.NEXT_PUBLIC_BASE_URL),
    note: process.env.NEXT_PUBLIC_BASE_URL
      ? 'configured as a local/preview fallback'
      : 'not required in Production; canonical customer links use TRANSFORMHER_PUBLIC_URL / the production hostname',
  }
  checks.BLOB_READ_WRITE_TOKEN = {
    set: storageReady,
    note: storageReady
      ? undefined
      : 'MISSING — production admin book uploads are disabled until persistent Blob storage is connected',
  }
  checks.VERCEL_URL = {
    set: Boolean(process.env.VERCEL_URL),
    note: 'deployment URL is never used for production customer-facing transactional links',
  }
  checks.DATABASE = {
    set: Boolean(db),
    note: db ? undefined : 'database unavailable',
  }

  return NextResponse.json({
    ...base,
    scaling: {
      ...SCALING_POLICY,
      databaseConnectionSource: databaseConnection.source,
      pooledDatabasePreferred: databaseConnection.pooledPreferred,
      dbPoolMaxPerInstance: getDbPoolMaxPerInstance(),
    },
    checks,
  }, {
    status: coreReady ? 200 : 503,
    headers: { 'Cache-Control': 'no-store' },
  })
}

import { NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { getCurrentUser } from '@/lib/auth'
import { getDb } from '@/lib/db/connection'
import {
  getCourierTemplateId,
  getLoginNotificationTemplateId,
} from '@/lib/email'
import { getBaseUrl } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export async function GET() {
  const resolvedLoginTemplate = getLoginNotificationTemplateId()
  let emailVerificationCodeTemplate = false
  try {
    emailVerificationCodeTemplate = Boolean(getCourierTemplateId('COURIER_TEMPLATE_EMAIL_VERIFICATION_CODE'))
  } catch {
    emailVerificationCodeTemplate = false
  }

  const checks = {
    database: false,
    authSchema: false,
    authSecret: Boolean(process.env.AUTH_SECRET),
    courier: Boolean(process.env.COURIER_API_KEY),
    welcomeEmailTemplate: Boolean(process.env.COURIER_TEMPLATE_WELCOME_VERIFY),
    loginEmailTemplate: Boolean(resolvedLoginTemplate),
    emailVerificationCodeTemplate,
    canonicalPublicUrl: getBaseUrl() === 'https://transformher.vercel.app',
  }

  try {
    const db = await getDb()
    if (db) {
      checks.database = true
      await db.execute(sql.raw('SELECT "id", "email", "password_hash", "role", "token_version", "account_status" FROM "user" LIMIT 1'))
      checks.authSchema = true
    }

    const authReady = checks.database && checks.authSchema && checks.authSecret
    const loginEmailReady = checks.courier && checks.loginEmailTemplate
    const verificationEmailReady = checks.courier && checks.welcomeEmailTemplate && checks.emailVerificationCodeTemplate
    const mailReady = checks.courier && checks.welcomeEmailTemplate && loginEmailReady && verificationEmailReady
    const status = authReady ? (mailReady ? 'ok' : 'degraded') : 'error'

    let masterAdmin = false
    try {
      masterAdmin = (await getCurrentUser())?.role === 'master_admin'
    } catch {
      masterAdmin = false
    }

    const base = {
      status,
      authReady,
      mailReady,
      loginEmailReady,
      verificationEmailReady,
      publicBaseUrl: getBaseUrl(),
    }

    return NextResponse.json(
      masterAdmin ? { ...base, checks } : base,
      {
        status: authReady ? 200 : 503,
        headers: { 'Cache-Control': 'no-store' },
      },
    )
  } catch (error) {
    console.error('[health/auth] dependency check failed', error)
    return NextResponse.json({
      status: 'error',
      authReady: false,
      mailReady: false,
      publicBaseUrl: getBaseUrl(),
    }, {
      status: 503,
      headers: { 'Cache-Control': 'no-store' },
    })
  }
}

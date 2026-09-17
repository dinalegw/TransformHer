import { NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { getDb } from '@/lib/db/connection'
import { DEFAULT_LOGIN_NOTIFICATION_TEMPLATE_ID, getLoginNotificationTemplateId } from '@/lib/email'

export const dynamic = 'force-dynamic'

export async function GET() {
  const configuredLoginTemplate = process.env.COURIER_TEMPLATE_LOGIN_NOTIFICATION?.trim() || ''
  const resolvedLoginTemplate = getLoginNotificationTemplateId()

  const checks = {
    database: false,
    authSchema: false,
    authSecret: Boolean(process.env.AUTH_SECRET),
    courier: Boolean(process.env.COURIER_API_KEY),
    welcomeEmailTemplate: Boolean(process.env.COURIER_TEMPLATE_WELCOME_VERIFY),
    loginEmailTemplate: Boolean(resolvedLoginTemplate),
  }

  try {
    const db = await getDb()
    if (!db) {
      return NextResponse.json({ status: 'degraded', checks }, {
        status: 503,
        headers: { 'Cache-Control': 'no-store' },
      })
    }

    checks.database = true
    await db.execute(sql.raw('SELECT "id", "email", "password_hash", "role", "token_version", "account_status" FROM "user" LIMIT 1'))
    checks.authSchema = true

    const authReady = checks.database && checks.authSchema && checks.authSecret
    const loginEmailReady = checks.courier && checks.loginEmailTemplate
    const mailReady = checks.courier && checks.welcomeEmailTemplate && loginEmailReady

    return NextResponse.json({
      status: authReady ? (mailReady ? 'ok' : 'degraded') : 'error',
      authReady,
      mailReady,
      loginEmailReady,
      loginEmailMode: configuredLoginTemplate ? 'template_env' : 'template_bootstrapped',
      loginTemplateId: resolvedLoginTemplate === DEFAULT_LOGIN_NOTIFICATION_TEMPLATE_ID
        ? DEFAULT_LOGIN_NOTIFICATION_TEMPLATE_ID
        : 'environment_override',
      checks,
    }, {
      status: authReady ? 200 : 503,
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    console.error('[health/auth] dependency check failed', error)
    return NextResponse.json({ status: 'error', authReady: false, mailReady: false, checks }, {
      status: 503,
      headers: { 'Cache-Control': 'no-store' },
    })
  }
}

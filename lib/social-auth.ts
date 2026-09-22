import 'server-only'

import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { getDb } from '@/lib/db/connection'
import { account, session, user, verification } from '@/lib/db/schema'
import { getBaseUrl } from '@/lib/utils'

let authPromise: Promise<ReturnType<typeof betterAuth>> | null = null

export function isGoogleAuthConfigured() {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID?.trim() &&
    process.env.GOOGLE_CLIENT_SECRET?.trim(),
  )
}

export async function getSocialAuth() {
  if (authPromise) return authPromise

  authPromise = (async () => {
    const db = await getDb()
    if (!db) throw new Error('Database not available')

    const clientId = process.env.GOOGLE_CLIENT_ID?.trim()
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim()

    return betterAuth({
      database: drizzleAdapter(db, {
        provider: 'pg',
        schema: { user, session, account, verification },
      }),
      secret: process.env.BETTER_AUTH_SECRET?.trim() || process.env.AUTH_SECRET,
      baseURL:
        process.env.BETTER_AUTH_URL?.trim() ||
        process.env.TRANSFORMHER_PUBLIC_URL?.trim() ||
        getBaseUrl(),
      socialProviders:
        clientId && clientSecret
          ? {
              google: {
                clientId,
                clientSecret,
              },
            }
          : {},
      account: {
        accountLinking: {
          enabled: true,
          trustedProviders: ['google'],
          allowDifferentEmails: false,
          updateUserInfoOnLink: false,
        },
      },
    })
  })()

  try {
    return await authPromise
  } catch (error) {
    authPromise = null
    throw error
  }
}

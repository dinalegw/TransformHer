import 'server-only'

import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { getDb } from '@/lib/db/connection'
import { socialAccount, socialSession, socialUser, socialVerification } from '@/lib/db/social-auth-schema'
import { getBaseUrl } from '@/lib/utils'

export function isGoogleAuthConfigured() {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID?.trim() &&
    process.env.GOOGLE_CLIENT_SECRET?.trim(),
  )
}

async function createSocialAuth() {
  const db = await getDb()
  if (!db) throw new Error('Database not available')

  const clientId = process.env.GOOGLE_CLIENT_ID?.trim()
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim()
  const secret =
    process.env.BETTER_AUTH_SECRET?.trim() ||
    process.env.AUTH_SECRET?.trim()
  if (!secret) throw new Error('Authentication secret is not configured')

  return betterAuth({
      database: drizzleAdapter(db, {
        provider: 'pg',
        schema: { user: socialUser, session: socialSession, account: socialAccount, verification: socialVerification },
      }),
      secret,
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
}

let authPromise: ReturnType<typeof createSocialAuth> | null = null

export async function getSocialAuth() {
  if (!authPromise) authPromise = createSocialAuth()

  try {
    return await authPromise
  } catch (error) {
    authPromise = null
    throw error
  }
}

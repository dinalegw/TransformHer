import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { createSession } from '@/lib/auth'
import { getDb } from '@/lib/db/connection'
import { user as userTable } from '@/lib/db/schema'
import { getSocialAuth, isGoogleAuthConfigured } from '@/lib/social-auth'

function safeRedirect(value: string | null) {
  if (!value) return '/books'
  const decoded = decodeURIComponent(value)
  return decoded.startsWith('/') && !decoded.startsWith('//') ? decoded : '/books'
}

function clearBetterAuthCookies(response: NextResponse) {
  for (const name of [
    'better-auth.session_token',
    '__Secure-better-auth.session_token',
    'better-auth.session_data',
    '__Secure-better-auth.session_data',
  ]) {
    response.cookies.set(name, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    })
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const redirectTo = safeRedirect(url.searchParams.get('redirect'))

  if (!isGoogleAuthConfigured()) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('error', 'Google sign-in is not configured yet.')
    return NextResponse.redirect(loginUrl)
  }

  try {
    const auth = await getSocialAuth()
    const socialSession = await auth.api.getSession({ headers: request.headers })

    if (!socialSession?.user?.id) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('error', 'Google sign-in session could not be verified.')
      return NextResponse.redirect(loginUrl)
    }

    const db = await getDb()
    if (!db) throw new Error('Database not available')

    await db
      .update(userTable)
      .set({
        emailVerified: true,
        image: socialSession.user.image ?? null,
        updatedAt: new Date(),
      })
      .where(eq(userTable.id, socialSession.user.id))

    const rows = await db
      .select({
        id: userTable.id,
        accountStatus: userTable.accountStatus,
      })
      .from(userTable)
      .where(eq(userTable.id, socialSession.user.id))
      .limit(1)

    const localUser = rows[0]
    if (!localUser || localUser.accountStatus !== 'active') {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set(
        'error',
        'This account is currently unavailable. Please contact TransformHer support.',
      )
      loginUrl.searchParams.set('support', '1')
      const blocked = NextResponse.redirect(loginUrl)
      clearBetterAuthCookies(blocked)
      return blocked
    }

    const sessionToken = await createSession(localUser.id)
    const response = NextResponse.redirect(new URL(redirectTo, request.url))
    response.cookies.set('session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    })

    return response
  } catch (error) {
    console.error('[auth/google] finalize failed', error)
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set(
      'error',
      'Google sign-in is temporarily unavailable. Please try again.',
    )
    return NextResponse.redirect(loginUrl)
  }
}

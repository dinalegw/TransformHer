import { NextResponse } from 'next/server'
import { isSameOriginRequest } from '@/lib/request-security'

export async function POST(req: Request) {
  if (!isSameOriginRequest(req)) {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 })
  }

  const res = NextResponse.json({ success: true })
  for (const name of [
    'session',
    'transformher_session',
    'better-auth.session_token',
    '__Secure-better-auth.session_token',
    'better-auth.session_data',
    '__Secure-better-auth.session_data',
  ]) {
    res.cookies.set(name, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    })
  }
  return res
}

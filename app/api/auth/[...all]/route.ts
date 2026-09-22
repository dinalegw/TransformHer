import { NextResponse } from 'next/server'
import { getSocialAuth, isGoogleAuthConfigured } from '@/lib/social-auth'

async function handle(request: Request) {
  if (!isGoogleAuthConfigured()) {
    return NextResponse.json(
      { error: 'Google sign-in is not configured yet.' },
      { status: 503 },
    )
  }

  try {
    const auth = await getSocialAuth()
    return auth.handler(request)
  } catch (error) {
    console.error('[auth/social] provider request failed', error)
    return NextResponse.json(
      { error: 'Social sign-in is temporarily unavailable.' },
      { status: 503 },
    )
  }
}

export const GET = handle
export const POST = handle

import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const origin = req.headers.get('origin')
  if (origin) {
    try {
      if (new URL(origin).host !== new URL(req.url).host) {
        return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 })
      }
    } catch {
      return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 })
    }
  }

  const res = NextResponse.json({ success: true })
  for (const name of ['session', 'transformher_session']) {
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

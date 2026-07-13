import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'

const AUTH_ROUTES = ['/login', '/signup', '/forgot-password', '/reset-password']

function verifyToken(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 2) return null
    const [data, sig] = parts
    const secret = process.env.AUTH_SECRET
    if (!secret) return null
    const expectedSig = createHmac('sha256', secret).update(data).digest('base64url')
    const sigBuf = Buffer.from(sig)
    const expectedBuf = Buffer.from(expectedSig)
    if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) return null
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf-8'))
    if (payload.exp && payload.exp < Date.now()) return null
    return payload
  } catch {
    return null
  }
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname === '/' || pathname.startsWith('/_next') || pathname.startsWith('/favicon') || pathname.startsWith('/icon') || pathname.startsWith('/apple-icon') || pathname.startsWith('/uploads') || pathname.startsWith('/books/') || pathname === '/hero-reading.png') {
    return NextResponse.next()
  }

  const sessionToken = request.cookies.get('session')?.value
  const user = sessionToken ? verifyToken(sessionToken) : null
  const isAuthenticated = !!user
  const isAdmin = user?.isAdmin === true || user?.role === 'master_admin' || user?.role === 'admin'

  if (pathname.startsWith('/admin')) {
    if (!isAuthenticated) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }
    if (!isAdmin) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  if (pathname.startsWith('/api/admin')) {
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  if (AUTH_ROUTES.some(route => pathname === route) && isAuthenticated) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  const response = NextResponse.next()

  const csp = [
    `default-src 'self'`,
    `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.paystack.co`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob:`,
    `font-src 'self' data:`,
    `connect-src 'self' https://api.paystack.co`,
    `frame-src https://standard.paystack.com`,
    `base-uri 'self'`,
    `form-action 'self'`,
  ].join('; ')

  const securityHeaders: Record<string, string> = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'X-XSS-Protection': '0',
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  }

  if (process.env.NODE_ENV === 'production') {
    securityHeaders['Content-Security-Policy'] = csp
  }

  for (const [key, value] of Object.entries(securityHeaders)) {
    response.headers.set(key, value)
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icon.svg|icon-light-32x32.png|icon-dark-32x32.png|apple-icon.png|placeholder.jpg|placeholder-logo.png|placeholder-logo.svg|placeholder.svg|placeholder-user.jpg).*)',
  ],
}

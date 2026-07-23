import { NextResponse } from 'next/server'

const RATE_LIMITS: Record<string, { limit: number; windowMs: number }> = {
  '/api/auth/login': { limit: 5, windowMs: 60_000 },
  '/api/auth/register': { limit: 3, windowMs: 60_000 },
  '/api/auth/forgot-password': { limit: 3, windowMs: 60_000 },
  '/api/auth/reset-password': { limit: 5, windowMs: 60_000 },
  '/api/paystack/initialize': { limit: 10, windowMs: 60_000 },
  '/api/cart/checkout': { limit: 5, windowMs: 60_000 },
}

interface RateLimitEntry {
  count: number
  resetAt: number
}

const ipBuckets = new Map<string, { [key: string]: RateLimitEntry }>()

function getClientIp(request: Request): string {
  return (
    (request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()) ||
    (request.headers.get('x-real-ip')) ||
    'unknown'
  )
}

export function checkRateLimit(request: Request, route: string): { allowed: boolean; retryAfter?: number } {
  const config = RATE_LIMITS[route]
  if (!config) return { allowed: true }

  const ip = getClientIp(request)
  const now = Date.now()
  const bucket = ipBuckets.get(ip) || {}

  const entry = bucket[route]
  if (!entry || now > entry.resetAt) {
    bucket[route] = { count: 1, resetAt: now + config.windowMs }
    ipBuckets.set(ip, bucket)
    return { allowed: true }
  }

  entry.count += 1

  if (entry.count > config.limit) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000)
    return { allowed: false, retryAfter }
  }

  return { allowed: true }
}

export function applyRateLimitHeaders(response: NextResponse, route: string): void {
  const config = RATE_LIMITS[route]
  if (!config) return

  response.headers.set('X-RateLimit-Limit', String(config.limit))
  response.headers.set('X-RateLimit-Window', `${config.windowMs / 1000}s`)
}

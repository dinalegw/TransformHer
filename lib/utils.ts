import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getDisplayName(user: {
  name: string
  username?: string | null
  showFullName?: boolean | null
}): string {
  if (user.showFullName || !user.username) return user.name
  return user.username
}

function normalizePublicUrl(value: string): string {
  const trimmed = value.trim().replace(/\/$/, '')
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}

/**
 * Public links sent to customers must use the stable production hostname.
 * VERCEL_URL identifies one immutable deployment and may be protected by Vercel
 * authentication, so it must never be used for production password-reset or
 * email-verification links.
 */
export function getBaseUrl(): string {
  const canonicalOverride = process.env.TRANSFORMHER_PUBLIC_URL?.trim()
  if (canonicalOverride) return normalizePublicUrl(canonicalOverride)

  if (process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production') {
    const productionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim()
    return productionUrl
      ? normalizePublicUrl(productionUrl)
      : 'https://transformher.vercel.app'
  }

  const configuredUrl = process.env.NEXT_PUBLIC_BASE_URL?.trim()
  if (configuredUrl) return normalizePublicUrl(configuredUrl)

  const vercelUrl = process.env.VERCEL_URL?.trim()
  if (vercelUrl) return normalizePublicUrl(vercelUrl)

  return 'http://localhost:3000'
}

/**
 * Return a Next/Image-safe source for data that may come from admin input or
 * legacy rows. We accept application-relative paths and http(s) URLs only.
 * Invalid or unsupported values fall back to a local placeholder instead of
 * throwing during rendering.
 */
export function safeImageSrc(value: unknown, fallback = '/placeholder.svg'): string {
  if (typeof value !== 'string') return fallback
  const candidate = value.trim()
  if (!candidate) return fallback
  if (candidate.startsWith('/') && !candidate.startsWith('//')) return candidate

  try {
    const parsed = new URL(candidate)
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') return candidate
  } catch {
    // Not a valid absolute URL.
  }

  return fallback
}

export function isSafeImageSrc(value: unknown): value is string {
  return safeImageSrc(value, '') !== ''
}

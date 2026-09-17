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

export function getBaseUrl(): string {
  const configuredUrl = process.env.NEXT_PUBLIC_BASE_URL
  if (configuredUrl) return configuredUrl.replace(/\/$/, '')

  const vercelUrl = process.env.VERCEL_URL
  if (vercelUrl) return `https://${vercelUrl}`
  if (process.env.NODE_ENV === 'development') return 'http://localhost:3000'
  return 'https://transformher.vercel.app'
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

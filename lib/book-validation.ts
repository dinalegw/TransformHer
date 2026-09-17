import type { Book } from '@/lib/db/schema'
import { isSafeImageSrc } from '@/lib/utils'

const CATEGORIES: Book['category'][] = [
  'Mindset & Confidence',
  'Career & Wealth',
  'Wellness & Self-Care',
  'Relationships',
  'Spirituality & Purpose',
  'Leadership',
]

const CURRENCIES: Book['currency'][] = ['NGN', 'USD', 'GBP', 'EUR']

export interface ValidatedBookMutation {
  title?: string
  author?: string
  category?: Book['category']
  price?: string
  currency?: Book['currency']
  coverImage?: string
  fileUrl?: string | null
  tagline?: string
  description?: string
  rating?: string
  reviewsCount?: number
  pages?: number
  featured?: boolean
  bestseller?: boolean
  slug?: string
}

function text(value: unknown, field: string, max: number, required = false): string | undefined {
  if (value === undefined) {
    if (required) throw new Error(`${field} is required`)
    return undefined
  }
  if (typeof value !== 'string') throw new Error(`${field} must be text`)
  const trimmed = value.trim()
  if (required && !trimmed) throw new Error(`${field} is required`)
  if (trimmed.length > max) throw new Error(`${field} is too long`)
  return trimmed
}

function integer(value: unknown, field: string, min: number, max: number): number | undefined {
  if (value === undefined) return undefined
  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new Error(`${field} must be a whole number between ${min} and ${max}`)
  }
  return parsed
}

function bool(value: unknown, field: string): boolean | undefined {
  if (value === undefined) return undefined
  if (typeof value !== 'boolean') throw new Error(`${field} must be true or false`)
  return value
}

function safeAsset(value: unknown, field: string, required = false): string | null | undefined {
  if (value === undefined) {
    if (required) throw new Error(`${field} is required`)
    return undefined
  }
  if (value === null || value === '') {
    if (required) throw new Error(`${field} is required`)
    return null
  }
  if (!isSafeImageSrc(value)) {
    throw new Error(`${field} must be an https URL or an application-relative path`)
  }
  return String(value).trim()
}

export function validateBookMutation(input: unknown, options: { partial?: boolean } = {}): ValidatedBookMutation {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('Invalid book payload')
  }

  const body = input as Record<string, unknown>
  const partial = options.partial ?? false
  const result: ValidatedBookMutation = {}

  result.title = text(body.title, 'title', 180, !partial)
  result.author = text(body.author, 'author', 140, !partial)

  if (body.category !== undefined || !partial) {
    if (!CATEGORIES.includes(body.category as Book['category'])) {
      throw new Error('Invalid book category')
    }
    result.category = body.category as Book['category']
  }

  if (body.price !== undefined || !partial) {
    const parsed = Number(body.price)
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100_000_000) {
      throw new Error('price must be a valid non-negative amount')
    }
    result.price = parsed.toFixed(2)
  }

  if (body.currency !== undefined) {
    if (!CURRENCIES.includes(body.currency as Book['currency'])) throw new Error('Invalid currency')
    result.currency = body.currency as Book['currency']
  } else if (!partial) {
    result.currency = 'NGN'
  }

  const cover = safeAsset(body.coverImage, 'coverImage', !partial)
  if (cover !== undefined) result.coverImage = cover ?? '/placeholder.svg'

  const file = safeAsset(body.fileUrl, 'fileUrl')
  if (file !== undefined) result.fileUrl = file

  result.tagline = text(body.tagline, 'tagline', 400)
  result.description = text(body.description, 'description', 20_000)

  if (body.rating !== undefined) {
    const parsed = Number(body.rating)
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 5) throw new Error('rating must be between 0 and 5')
    result.rating = parsed.toFixed(1)
  }

  result.reviewsCount = integer(body.reviewsCount, 'reviewsCount', 0, 100_000_000)
  result.pages = integer(body.pages, 'pages', 0, 100_000)
  result.featured = bool(body.featured, 'featured')
  result.bestseller = bool(body.bestseller, 'bestseller')

  const slug = text(body.slug, 'slug', 120)
  if (slug !== undefined) result.slug = slug

  for (const key of Object.keys(result) as Array<keyof ValidatedBookMutation>) {
    if (result[key] === undefined) delete result[key]
  }

  return result
}

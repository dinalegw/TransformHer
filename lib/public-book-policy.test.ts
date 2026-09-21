import { describe, expect, it } from 'vitest'
import { shouldExcludeSeedBooks } from '@/lib/public-book-policy'

describe('production catalogue policy', () => {
  it('excludes demo seed books in production', () => {
    expect(shouldExcludeSeedBooks('production')).toBe(true)
  })

  it('keeps seed books available for local development and tests', () => {
    expect(shouldExcludeSeedBooks('development')).toBe(false)
    expect(shouldExcludeSeedBooks('test')).toBe(false)
  })
})

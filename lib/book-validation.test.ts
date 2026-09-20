import { describe, expect, it } from 'vitest'
import { validateBookMutation } from './book-validation'

const baseBook = {
  title: 'A Better Tomorrow',
  author: 'TransformHer',
  category: 'Mindset & Confidence',
  price: 2500,
  currency: 'NGN',
  coverImage: '/placeholder.svg',
}

describe('validateBookMutation managed book files', () => {
  it('accepts a private Vercel Blob pathname returned by the upload route', () => {
    const result = validateBookMutation({
      ...baseBook,
      fileUrl: 'uploads/books/a-better-tomorrow/550e8400-e29b-41d4-a716-446655440000.pdf',
    })

    expect(result.fileUrl).toBe(
      'uploads/books/a-better-tomorrow/550e8400-e29b-41d4-a716-446655440000.pdf',
    )
  })

  it('accepts the local-development managed upload namespace', () => {
    const result = validateBookMutation({
      ...baseBook,
      fileUrl: '/uploads/books/a-better-tomorrow/local-book.pdf',
    })

    expect(result.fileUrl).toBe('/uploads/books/a-better-tomorrow/local-book.pdf')
  })

  it('rejects arbitrary remote URLs as protected reader storage references', () => {
    expect(() => validateBookMutation({
      ...baseBook,
      fileUrl: 'https://example.com/not-managed/book.pdf',
    })).toThrow(/managed book upload/)
  })

  it('rejects path traversal in a book file reference', () => {
    expect(() => validateBookMutation({
      ...baseBook,
      fileUrl: 'uploads/books/a-better-tomorrow/../../secret.pdf',
    })).toThrow(/managed book upload/)
  })
})

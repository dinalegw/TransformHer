import { describe, expect, it } from 'vitest'
import { isTranslationAllowedPath } from '@/lib/translation-routes'

describe('isTranslationAllowedPath', () => {
  it.each([
    '/',
    '/books',
    '/books/the-woman-youre-becoming',
    '/faq',
  ])('allows translation on public content route %s', (pathname) => {
    expect(isTranslationAllowedPath(pathname)).toBe(true)
  })

  it.each([
    '/admin',
    '/admin/users',
    '/profile',
    '/profile/security',
    '/library',
    '/library/book-1',
    '/cart',
    '/login',
    '/signup',
    '/forgot-password',
    '/reset-password',
    '/verify-email',
  ])('blocks translation on sensitive route %s', (pathname) => {
    expect(isTranslationAllowedPath(pathname)).toBe(false)
  })

  it('does not over-block unrelated paths that merely contain a sensitive word', () => {
    expect(isTranslationAllowedPath('/books/administering-change')).toBe(true)
    expect(isTranslationAllowedPath('/faq/profile-guidance')).toBe(true)
  })
})

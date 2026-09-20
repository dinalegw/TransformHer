const TRANSLATION_BLOCKED_PREFIXES = [
  '/admin',
  '/profile',
  '/library',
  '/cart',
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
]

export function isTranslationAllowedPath(pathname: string) {
  return !TRANSLATION_BLOCKED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )
}

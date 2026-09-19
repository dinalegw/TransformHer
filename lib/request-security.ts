/**
 * Browser-origin guard for authenticated state-changing endpoints.
 *
 * SameSite cookies are useful but are not the only CSRF boundary. Modern
 * browsers normally send Origin and Sec-Fetch-Site on mutation requests; API
 * clients may omit both, so missing headers remain allowed while an explicit
 * cross-origin signal is rejected.
 */
export function isSameOriginRequest(req: Request): boolean {
  const origin = req.headers.get('origin')
  if (origin) {
    try {
      return new URL(origin).origin === new URL(req.url).origin
    } catch {
      return false
    }
  }

  const fetchSite = req.headers.get('sec-fetch-site')?.toLowerCase()
  if (fetchSite === 'cross-site') return false

  return true
}

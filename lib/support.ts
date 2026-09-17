export const SUPPORT_EMAIL = 'transformher360@gmail.com'

export function supportMailto(subject?: string): string {
  const query = subject ? `?subject=${encodeURIComponent(subject)}` : ''
  return `mailto:${SUPPORT_EMAIL}${query}`
}

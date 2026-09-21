import type { MetadataRoute } from 'next'
import { getBaseUrl } from '@/lib/utils'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getBaseUrl()

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/api/', '/profile/', '/library/', '/cart/', '/login', '/signup', '/forgot-password', '/reset-password', '/verify-email'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}

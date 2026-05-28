import type { MetadataRoute } from 'next'
import { absoluteUrl, siteUrl } from '@/lib/site-seo'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/projects',
          '/project/',
          '/team',
          '/dashboard',
          '/settings/',
          '/checkout',
          '/onboarding/',
          '/auth/',
        ],
      },
    ],
    sitemap: absoluteUrl('/sitemap.xml'),
    host: siteUrl(),
  }
}

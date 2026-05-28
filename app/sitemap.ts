import type { MetadataRoute } from 'next'
import { absoluteUrl } from '@/lib/site-seo'

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()

  return [
    {
      url: absoluteUrl('/'),
      lastModified,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: absoluteUrl('/login'),
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ]
}

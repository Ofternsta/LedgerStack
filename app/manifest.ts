import type { MetadataRoute } from 'next'
import { SITE_DESCRIPTION, SITE_NAME } from '@/lib/site-seo'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#050505',
    theme_color: '#050505',
    categories: ['business', 'productivity'],
    icons: [
      {
        src: '/icon.png?v=2',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/apple-icon.png?v=2',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  }
}

import type { Metadata } from 'next'
import { MarketingHome } from '@/components/marketing-home'
import { MarketingStructuredData } from '@/components/marketing-structured-data'
import {
  createPageMetadata,
  SITE_DESCRIPTION,
  SITE_SERP_TITLE,
} from '@/lib/site-seo'

/** Static marketing page; logged-in users are redirected in middleware. */
export const dynamic = 'force-static'

export const metadata: Metadata = createPageMetadata({
  title: SITE_SERP_TITLE,
  description: SITE_DESCRIPTION,
  path: '/',
  useFullTitle: true,
})

export default function HomePage() {
  return (
    <>
      <MarketingStructuredData />
      <MarketingHome />
    </>
  )
}

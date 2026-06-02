import type { Metadata } from 'next'
import { MarketingHome } from '@/components/marketing-home'
import { MarketingStructuredData } from '@/components/marketing-structured-data'
import { absoluteUrl } from '@/lib/site-seo'

/** Static marketing page; logged-in users are redirected in middleware. */
export const dynamic = 'force-static'

export const metadata: Metadata = {
  alternates: { canonical: absoluteUrl('/') },
  openGraph: { url: absoluteUrl('/') },
}

export default function HomePage() {
  return (
    <>
      <MarketingStructuredData />
      <MarketingHome />
    </>
  )
}

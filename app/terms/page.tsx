import type { Metadata } from 'next'
import { TermsContent } from '@/components/legal/terms-content'
import { absoluteUrl, SITE_NAME } from '@/lib/site-seo'

export const dynamic = 'force-static'

export const metadata: Metadata = {
  title: `Terms of Service — ${SITE_NAME}`,
  description: `Terms governing use of ${SITE_NAME}.`,
  alternates: { canonical: absoluteUrl('/terms') },
  robots: { index: true, follow: true },
}

export default function TermsPage() {
  return <TermsContent />
}

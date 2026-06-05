import type { Metadata } from 'next'
import { TermsContent } from '@/components/legal/terms-content'
import { LegalStructuredData } from '@/components/legal-structured-data'
import { createPageMetadata, SITE_NAME } from '@/lib/site-seo'

export const dynamic = 'force-static'

export const metadata: Metadata = createPageMetadata({
  title: `Terms of Service`,
  description: `Terms governing use of ${SITE_NAME} — subscriptions, plans, AI features, client e-signatures, data retention, worker access, and contractor responsibilities.`,
  path: '/terms',
})

export default function TermsPage() {
  return (
    <>
      <LegalStructuredData pageName="Terms of Service" path="/terms" />
      <TermsContent />
    </>
  )
}

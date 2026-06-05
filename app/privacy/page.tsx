import type { Metadata } from 'next'
import { PrivacyContent } from '@/components/legal/privacy-content'
import { LegalStructuredData } from '@/components/legal-structured-data'
import { createPageMetadata, SITE_NAME } from '@/lib/site-seo'

export const dynamic = 'force-static'

export const metadata: Metadata = createPageMetadata({
  title: `Privacy Policy`,
  description: `How ${SITE_NAME} collects, uses, stores, and protects your data — including projects, uploads, AI processing, SignWell e-signatures, billing, and account deletion.`,
  path: '/privacy',
})

export default function PrivacyPage() {
  return (
    <>
      <LegalStructuredData pageName="Privacy Policy" path="/privacy" />
      <PrivacyContent />
    </>
  )
}

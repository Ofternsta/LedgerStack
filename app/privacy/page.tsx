import type { Metadata } from 'next'
import { PrivacyContent } from '@/components/legal/privacy-content'
import { absoluteUrl, SITE_NAME } from '@/lib/site-seo'

export const dynamic = 'force-static'

export const metadata: Metadata = {
  title: `Privacy Policy — ${SITE_NAME}`,
  description: `How ${SITE_NAME} collects, uses, and protects your information.`,
  alternates: { canonical: absoluteUrl('/privacy') },
  robots: { index: true, follow: true },
}

export default function PrivacyPage() {
  return <PrivacyContent />
}

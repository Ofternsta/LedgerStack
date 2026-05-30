import type { Metadata } from 'next'
import { HowToContent } from '@/components/how-to-content'
import { absoluteUrl, SITE_NAME } from '@/lib/site-seo'

export const dynamic = 'force-static'

export const metadata: Metadata = {
  title: `How to use ${SITE_NAME}`,
  description: `Learn how ${SITE_NAME} works: projects, jobs, workers, clients, AI, billing, backups, and organization settings.`,
  alternates: { canonical: absoluteUrl('/how-to') },
  robots: { index: true, follow: true },
}

export default function HowToPage() {
  return <HowToContent />
}

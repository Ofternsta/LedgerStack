import type { Metadata } from 'next'
import { HowToContent } from '@/components/how-to-content'
import { HowToStructuredData } from '@/components/how-to-structured-data'
import { createPageMetadata, SITE_NAME } from '@/lib/site-seo'

export const dynamic = 'force-static'

export const metadata: Metadata = createPageMetadata({
  title: `How to use ${SITE_NAME}`,
  description: `Step-by-step guide to ${SITE_NAME}: create projects, manage jobs, upload and rename field documents, invite workers and clients, request e-signatures, use AI summaries and project chat, calendar, backups, and billing.`,
  path: '/how-to',
})

export default function HowToPage() {
  return (
    <>
      <HowToStructuredData />
      <HowToContent />
    </>
  )
}

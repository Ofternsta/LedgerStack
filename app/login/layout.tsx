import type { Metadata } from 'next'
import { createPageMetadata, SITE_NAME } from '@/lib/site-seo'

export const metadata: Metadata = createPageMetadata({
  title: 'Sign in',
  description: `Sign in or create your ${SITE_NAME} account — contractor project management for jobs, field documentation, crew coordination, and client sharing.`,
  path: '/login',
})

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}

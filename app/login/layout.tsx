import type { Metadata } from 'next'
import { SITE_NAME } from '@/lib/site-seo'

export const metadata: Metadata = {
  title: 'Sign in',
  description: `Sign in to ${SITE_NAME} — field jobs, client sharing, crew coordination, and project documents.`,
  robots: { index: true, follow: true },
}

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}

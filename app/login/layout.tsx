import type { Metadata } from 'next'
import { absoluteUrl, SITE_NAME } from '@/lib/site-seo'

export const metadata: Metadata = {
  title: 'Sign in',
  description: `Sign in to ${SITE_NAME} — field jobs, client sharing, crew coordination, and project documents.`,
  alternates: { canonical: absoluteUrl('/login') },
  robots: { index: true, follow: true },
  openGraph: { url: absoluteUrl('/login') },
}

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}

import type { Metadata } from 'next'
import { absoluteUrl } from '@/lib/site-seo'

export const metadata: Metadata = {
  title: 'Reset password',
  alternates: { canonical: absoluteUrl('/login/reset-password') },
  robots: { index: false, follow: false },
}

export default function ResetPasswordLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}

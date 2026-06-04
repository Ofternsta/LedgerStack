import type { Metadata } from 'next'
import { createPageMetadata } from '@/lib/site-seo'

export const metadata: Metadata = createPageMetadata({
  title: 'Reset password',
  description:
    'Reset your LedgerStack account password. Contractor project management sign-in recovery.',
  path: '/login/reset-password',
  index: false,
})

export default function ResetPasswordLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}

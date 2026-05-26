import type { Metadata } from 'next'
import { MarketingHome } from '@/components/marketing-home'

export const metadata: Metadata = {
  title: 'LedgerStack — Reports & documents for restoration contractors',
  description:
    'Organize restoration projects, track report status, upload documents with AI, and collaborate with your team and clients.',
  openGraph: {
    title: 'LedgerStack',
    description:
      'Reports, documents, and teams in one place for restoration contractors.',
    type: 'website',
  },
}

/** Static marketing page; logged-in users are redirected in middleware. */
export const dynamic = 'force-static'

export default function HomePage() {
  return <MarketingHome />
}

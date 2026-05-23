import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { MarketingHome } from '@/components/marketing-home'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'LedgerStack — Claims & evidence for restoration contractors',
  description:
    'Organize restoration projects, track claim status, upload evidence with AI, and collaborate with your team and clients.',
  openGraph: {
    title: 'LedgerStack',
    description:
      'Claims, evidence, and teams in one place for restoration contractors.',
    type: 'website',
  },
}

export default async function HomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user?.email_confirmed_at) {
    redirect('/projects')
  }

  return <MarketingHome />
}

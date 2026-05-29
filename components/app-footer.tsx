import Link from 'next/link'
import { SupportLink } from '@/components/support-link'
import { LegalNotice } from '@/components/legal-notice'

export function AppFooter() {
  return (
    <footer className="mt-10 pt-6 border-t border-border text-sm text-muted space-y-4">
      <p>
        Questions? <SupportLink />
      </p>
      <p className="text-xs">
        <Link href="/privacy" className="text-brand-bright hover:underline">
          Privacy Policy
        </Link>
        {' · '}
        <Link href="/terms" className="text-brand-bright hover:underline">
          Terms of Service
        </Link>
      </p>
      <LegalNotice id="security" />
    </footer>
  )
}

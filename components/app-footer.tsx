import { SupportLink } from '@/components/support-link'
import { LegalNotice } from '@/components/legal-notice'

type AppFooterProps = {
  /** Show data retention notice above the security notice (projects page). */
  showDataRetention?: boolean
}

export function AppFooter({ showDataRetention = false }: AppFooterProps) {
  return (
    <footer className="mt-10 pt-6 border-t border-border text-sm text-muted space-y-4 text-center max-w-2xl mx-auto w-full">
      {showDataRetention && (
        <LegalNotice
          id="data-retention"
          className="text-center [&_p]:text-center"
        />
      )}
      <LegalNotice id="security" className="text-center [&_p]:text-center" />
      <p>
        Questions? <SupportLink />
      </p>
    </footer>
  )
}

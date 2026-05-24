import { SupportLink } from '@/components/support-link'

export function AppFooter() {
  return (
    <footer className="mt-10 pt-6 border-t border-border text-sm text-muted">
      <p>
        Questions?{' '}
        <SupportLink />
      </p>
    </footer>
  )
}

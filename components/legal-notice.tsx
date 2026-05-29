import Link from 'next/link'
import {
  LEGAL_NOTICES,
  type LegalNoticeId,
} from '@/lib/legal-notices'

type LegalNoticeProps = {
  id: LegalNoticeId
  className?: string
  /** Show links to Privacy Policy and Terms below the notice. */
  showLegalLinks?: boolean
}

export function LegalNotice({
  id,
  className = '',
  showLegalLinks = false,
}: LegalNoticeProps) {
  const notice = LEGAL_NOTICES[id]

  return (
    <aside
      className={`rounded-lg border border-border/80 bg-surface px-3 py-2.5 text-xs text-muted leading-relaxed ${className}`}
      role="note"
      aria-label={notice.title}
    >
      <p className="font-semibold text-foreground/90 mb-1">{notice.title}</p>
      <p>{notice.body}</p>
      {showLegalLinks && (
        <p className="mt-2 pt-2 border-t border-border/60">
          <Link href="/privacy" className="text-brand-bright hover:underline">
            Privacy Policy
          </Link>
          {' · '}
          <Link href="/terms" className="text-brand-bright hover:underline">
            Terms of Service
          </Link>
        </p>
      )}
    </aside>
  )
}

import type { ReactNode } from 'react'
import { SUPPORT_EMAIL, supportMailtoUrl } from '@/lib/support'

type SupportLinkProps = {
  className?: string
  subject?: string
  /** Show the email address as link text (default: true) */
  showEmail?: boolean
  children?: ReactNode
}

export function SupportLink({
  className = 'text-brand-bright hover:underline',
  subject,
  showEmail = true,
  children,
}: SupportLinkProps) {
  return (
    <a href={supportMailtoUrl(subject)} className={className}>
      {children ?? (showEmail ? SUPPORT_EMAIL : 'Contact support')}
    </a>
  )
}

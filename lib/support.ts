/** Public support inbox for LedgerStack */
export const SUPPORT_EMAIL = 'support@ledgerstack.org'

export function supportMailtoUrl(subject?: string): string {
  if (!subject?.trim()) return `mailto:${SUPPORT_EMAIL}`
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject.trim())}`
}

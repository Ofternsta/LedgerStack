import { SUPPORT_EMAIL } from '@/lib/support'

/** Operator name shown in legal documents (individual or company). */
export const LEGAL_OPERATOR_NAME =
  process.env.NEXT_PUBLIC_LEGAL_OPERATOR_NAME?.trim() || 'LedgerStack'

export const LEGAL_PRODUCT_NAME = 'LedgerStack'
export const LEGAL_WEBSITE = 'https://ledgerstack.org'
export const LEGAL_CONTACT_EMAIL = SUPPORT_EMAIL

/** Display date for “Last updated” on legal pages. Update when policies change. */
export const LEGAL_LAST_UPDATED = 'May 29, 2026'

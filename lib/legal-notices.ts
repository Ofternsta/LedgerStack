/** Short in-app notices — not a substitute for Privacy Policy / Terms. */

export type LegalNoticeId =
  | 'ai'
  | 'file-responsibility'
  | 'no-guarantee'
  | 'data-retention'
  | 'client-access'
  | 'security'
  | 'export-backup'
  | 'worker-audit'

export type LegalNoticeContent = {
  title: string
  body: string
}

export const LEGAL_NOTICES: Record<LegalNoticeId, LegalNoticeContent> = {
  ai: {
    title: 'AI disclaimer',
    body:
      'AI summaries, timelines, and categorization are automated aids only. They may be incomplete or inaccurate. Review all output before sharing with clients or third parties. LedgerStack does not provide legal, regulatory, or professional trade advice.',
  },
  'file-responsibility': {
    title: 'File responsibility',
    body:
      'You are responsible for the files you upload and share. Do not upload unlawful content or data you lack rights to use. Verify accuracy and permissions before sharing documents with clients or third parties.',
  },
  'no-guarantee': {
    title: 'No guarantee',
    body:
      'Report status, schedules, and exports reflect information entered by your team. LedgerStack does not guarantee job outcomes, client approvals, or regulatory compliance for your work.',
  },
  'data-retention': {
    title: 'Data retention & deletion',
    body:
      'Completed projects are deleted 7 days after all reports reach the final completed stage. Inactive projects are deleted after 12 months with no activity. Organization backup limits depend on your plan (5–30). Full account deletion: email support@ledgerstack.org. See our Privacy Policy.',
  },
  'client-access': {
    title: 'Client access warning',
    body:
      'Clients only see files you explicitly share. Grant access only to the correct email address. You are responsible for what clients can view and download once shared.',
  },
  security: {
    title: 'Security (best effort)',
    body:
      'We use industry-standard hosting and access controls, but no system is 100% secure. Use strong passwords, limit admin access, and maintain your own backups of critical records.',
  },
  'export-backup': {
    title: 'Export & backup reminder',
    body:
      'Exports and scheduled backups are provided as a convenience. Keep your own copies of important records. LedgerStack is not responsible for lost data due to deletion, outage, or misconfiguration.',
  },
  'worker-audit': {
    title: 'Worker activity',
    body:
      'Actions by workers and admins on this project (uploads, status changes, messages, and notes) may be visible to organization admins. Use internal notes for staff-only discussion.',
  },
}

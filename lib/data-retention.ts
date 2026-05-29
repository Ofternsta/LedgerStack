/** Automated project retention policy (see Privacy Policy). */

export const COMPLETED_PROJECT_RETENTION_DAYS = 7

export const INACTIVE_PROJECT_RETENTION_MONTHS = 12

export function completedRetentionCutoff(): Date {
  const d = new Date()
  d.setDate(d.getDate() - COMPLETED_PROJECT_RETENTION_DAYS)
  return d
}

export function inactiveRetentionCutoff(): Date {
  const d = new Date()
  d.setMonth(d.getMonth() - INACTIVE_PROJECT_RETENTION_MONTHS)
  return d
}

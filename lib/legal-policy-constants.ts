/** Values referenced in Privacy Policy and Terms (keep in sync with product behavior). */

export {
  COMPLETED_PROJECT_RETENTION_DAYS,
  INACTIVE_PROJECT_RETENTION_MONTHS,
} from '@/lib/data-retention'

import { BACKUP_LIMITS_DISPLAY } from '@/lib/backup-limits'
import {
  PLAN_ENTITLEMENTS,
  formatAiSummariesPerMonth,
  formatPlanLimit,
} from '@/lib/plan-entitlements'

export { BACKUP_LIMITS_DISPLAY }

export const MAX_PROJECT_STATUS_STAGES = 20

/** User-facing plan caps for legal pages (derived from PLAN_ENTITLEMENTS). */
export const PLAN_AI_LIMITS_DISPLAY = {
  trial: formatAiSummariesPerMonth(PLAN_ENTITLEMENTS.trial.aiSummariesPerMonth),
  starter: formatAiSummariesPerMonth(PLAN_ENTITLEMENTS.starter.aiSummariesPerMonth),
  professional: formatAiSummariesPerMonth(
    PLAN_ENTITLEMENTS.professional.aiSummariesPerMonth
  ),
  enterprise: formatAiSummariesPerMonth(
    PLAN_ENTITLEMENTS.enterprise.aiSummariesPerMonth
  ),
} as const

export const PLAN_PROJECT_LIMITS_DISPLAY = {
  trial: formatPlanLimit(PLAN_ENTITLEMENTS.trial.maxActiveProjects, 'active projects'),
  starter: formatPlanLimit(
    PLAN_ENTITLEMENTS.starter.maxActiveProjects,
    'active projects'
  ),
  professional: formatPlanLimit(
    PLAN_ENTITLEMENTS.professional.maxActiveProjects,
    'active projects'
  ),
  enterprise: formatPlanLimit(
    PLAN_ENTITLEMENTS.enterprise.maxActiveProjects,
    'active projects'
  ),
} as const

export const PLAN_STAFF_LIMITS_DISPLAY = {
  trial: formatPlanLimit(PLAN_ENTITLEMENTS.trial.maxStaffUsers, 'staff users'),
  starter: formatPlanLimit(PLAN_ENTITLEMENTS.starter.maxStaffUsers, 'staff users'),
  professional: formatPlanLimit(
    PLAN_ENTITLEMENTS.professional.maxStaffUsers,
    'staff users'
  ),
  enterprise: formatPlanLimit(
    PLAN_ENTITLEMENTS.enterprise.maxStaffUsers,
    'staff users'
  ),
} as const

/** One-line tier summaries for Terms / Privacy. */
export const PLAN_TIER_LEGAL_SUMMARIES = [
  `Trial (7 days, card required) — ${PLAN_PROJECT_LIMITS_DISPLAY.trial}, ${PLAN_AI_LIMITS_DISPLAY.trial} AI summaries per calendar month, images/PDF uploads only; no exports, workers, client portal, calendar, or team chat.`,
  `Starter ($20/month) — ${PLAN_STAFF_LIMITS_DISPLAY.starter}, ${PLAN_PROJECT_LIMITS_DISPLAY.starter}, ${PLAN_AI_LIMITS_DISPLAY.starter} AI summaries per calendar month, standard PDF export, automatic backups (${BACKUP_LIMITS_DISPLAY.starter} retained).`,
  `Professional ($70/month) — up to ${PLAN_ENTITLEMENTS.professional.maxStaffUsers} staff users, ${PLAN_PROJECT_LIMITS_DISPLAY.professional}, ${PLAN_AI_LIMITS_DISPLAY.professional} AI summaries per calendar month, client portal, calendar, internal notes, team messages, job packet exports, analytics, automatic backups (${BACKUP_LIMITS_DISPLAY.professional} retained).`,
  `Enterprise ($150/month) — ${PLAN_STAFF_LIMITS_DISPLAY.enterprise}, ${PLAN_PROJECT_LIMITS_DISPLAY.enterprise}, ${PLAN_AI_LIMITS_DISPLAY.enterprise} AI summaries per calendar month, advanced analytics, automatic backups (${BACKUP_LIMITS_DISPLAY.enterprise} retained), priority support.`,
] as const

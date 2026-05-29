import type { BillingPlanId } from '@/lib/stripe-config'
import { PLAN_ENTITLEMENTS } from '@/lib/plan-entitlements'

export function maxOrganizationBackupsForPlan(plan: BillingPlanId): number {
  return PLAN_ENTITLEMENTS[plan].maxOrganizationBackups
}

/** For legal copy — paid tiers that include automatic backups */
export const BACKUP_LIMITS_DISPLAY = {
  starter: PLAN_ENTITLEMENTS.starter.maxOrganizationBackups,
  professional: PLAN_ENTITLEMENTS.professional.maxOrganizationBackups,
  enterprise: PLAN_ENTITLEMENTS.enterprise.maxOrganizationBackups,
} as const

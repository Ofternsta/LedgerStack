import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  getPlanEntitlements,
  isUnlimited,
  type PlanEntitlements,
} from '@/lib/plan-entitlements'
import {
  countOrgProjects,
  currentUsageMonthKey,
  getAiUsageThisMonth,
} from '@/lib/plan-usage'
import { getOrgPlanContext } from '@/lib/org-plan'
import type { BillingPlanId } from '@/lib/stripe-config'
import { createServiceClient } from '@/lib/supabase/service'

export { countOrgProjects, getAiUsageThisMonth } from '@/lib/plan-usage'

export function planUpgradeMessage(
  feature: string,
  plan: BillingPlanId | null
): string {
  const target =
    plan === 'trial' || plan === 'starter'
      ? 'Professional'
      : 'a higher plan'
  return `${feature} requires ${target}. Upgrade in Billing settings.`
}

export async function countOrgStaff(
  supabase: SupabaseClient,
  organizationId: string
): Promise<number> {
  const { count, error } = await supabase
    .from('organization_members')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .eq('status', 'approved')

  if (error) return 1
  return 1 + (count ?? 0)
}

export async function consumeAiSummary(
  organizationId: string,
  entitlements: PlanEntitlements
): Promise<{ ok: true } | { ok: false; error: string; used: number; limit: number }> {
  if (isUnlimited(entitlements.aiSummariesPerMonth)) {
    return { ok: true }
  }

  const service = createServiceClient()
  const monthKey = currentUsageMonthKey()
  const used = await getAiUsageThisMonth(service, organizationId)

  if (used >= entitlements.aiSummariesPerMonth) {
    return {
      ok: false,
      error: planUpgradeMessage('More AI summaries this month', null),
      used,
      limit: entitlements.aiSummariesPerMonth,
    }
  }

  const { error } = await service.from('organization_ai_usage').upsert(
    {
      organization_id: organizationId,
      month_key: monthKey,
      summaries_used: used + 1,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'organization_id,month_key' }
  )

  if (error) {
    console.error('AI usage upsert failed:', error.message)
  }

  return { ok: true }
}

export async function assertCanCreateProject(
  _supabase: SupabaseClient,
  organizationId: string
): Promise<{ ok: true; plan: BillingPlanId } | { ok: false; error: string }> {
  const service = createServiceClient()
  const ctx = await getOrgPlanContext(service, organizationId)
  if (!ctx) {
    return { ok: false, error: 'Active subscription required to create projects.' }
  }

  if (!isUnlimited(ctx.entitlements.maxActiveProjects)) {
    const count = await countOrgProjects(service, organizationId)
    if (count >= ctx.entitlements.maxActiveProjects) {
      return {
        ok: false,
        error: `Project limit reached (${ctx.entitlements.maxActiveProjects} on ${ctx.plan}). Upgrade your plan in Billing.`,
      }
    }
  }

  return { ok: true, plan: ctx.plan }
}

export async function assertOrgFeature(
  _supabase: SupabaseClient,
  organizationId: string,
  feature: keyof PlanEntitlements,
  featureLabel: string
): Promise<
  | { ok: true; plan: BillingPlanId; entitlements: PlanEntitlements }
  | { ok: false; error: string }
> {
  const service = createServiceClient()
  const ctx = await getOrgPlanContext(service, organizationId)
  if (!ctx) {
    return { ok: false, error: 'Active subscription required.' }
  }

  const allowed = ctx.entitlements[feature]
  if (typeof allowed === 'boolean' && !allowed) {
    return {
      ok: false,
      error: planUpgradeMessage(featureLabel, ctx.plan),
    }
  }

  return { ok: true, plan: ctx.plan, entitlements: ctx.entitlements }
}

export async function assertCanAddWorker(
  _supabase: SupabaseClient,
  organizationId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const service = createServiceClient()
  const feature = await assertOrgFeature(
    service,
    organizationId,
    'workerAccounts',
    'Worker accounts'
  )
  if (!feature.ok) return feature

  const entitlements = getPlanEntitlements(feature.plan)
  if (!isUnlimited(entitlements.maxStaffUsers)) {
    const staff = await countOrgStaff(service, organizationId)
    if (staff >= entitlements.maxStaffUsers) {
      return {
        ok: false,
        error: `Staff limit reached (${entitlements.maxStaffUsers} users on ${feature.plan}). Upgrade to add more team members.`,
      }
    }
  }

  return { ok: true }
}

const BASIC_UPLOAD_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
  'application/pdf',
])

export function validateUploadForPlan(
  fileType: string,
  fileSize: number,
  entitlements: PlanEntitlements
): string | null {
  if (fileSize > entitlements.maxUploadBytes) {
    const mb = Math.round(entitlements.maxUploadBytes / (1024 * 1024))
    return `File exceeds your plan limit (${mb} MB max).`
  }

  if (entitlements.basicUploadsOnly) {
    const type = (fileType || '').toLowerCase()
    if (!BASIC_UPLOAD_TYPES.has(type) && !type.startsWith('image/')) {
      return 'Trial plan allows images and PDF uploads only. Upgrade for video and other file types.'
    }
  }

  return null
}

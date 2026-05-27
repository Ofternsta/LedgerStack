import type { SupabaseClient } from '@supabase/supabase-js'
import { isActiveSubscriptionStatus } from '@/lib/admin-subscription-status'
import {
  getPlanEntitlements,
  type PlanEntitlements,
} from '@/lib/plan-entitlements'
import type { BillingPlanId } from '@/lib/stripe-config'
import { isTrialExpired } from '@/lib/trial-utils'

export type OrgPlanContext = {
  organizationId: string
  plan: BillingPlanId
  entitlements: PlanEntitlements
  subscriptionStatus: string
}

export async function getOrgPlanContext(
  supabase: SupabaseClient,
  organizationId: string
): Promise<OrgPlanContext | null> {
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('plan, status, trial_ends_at')
    .eq('organization_id', organizationId)
    .maybeSingle()

  if (!sub?.plan) return null

  const plan = sub.plan as BillingPlanId
  if (!['trial', 'starter', 'professional', 'enterprise'].includes(plan)) {
    return null
  }

  if (!isActiveSubscriptionStatus(sub.status)) {
    return null
  }

  if (plan === 'trial' && isTrialExpired(sub.trial_ends_at)) {
    return null
  }

  return {
    organizationId,
    plan,
    entitlements: getPlanEntitlements(plan),
    subscriptionStatus: sub.status,
  }
}

/** Resolve organization for any role (admin, worker, client via project access). */
export async function resolveUserOrganizationId(
  supabase: SupabaseClient,
  userId: string,
  role: string
): Promise<string | null> {
  if (role === 'admin') {
    const { data: org } = await supabase
      .from('organizations')
      .select('id')
      .eq('admin_user_id', userId)
      .maybeSingle()
    return org?.id ?? null
  }

  if (role === 'worker') {
    const { data: membership } = await supabase
      .from('organization_members')
      .select('organization_id, status')
      .eq('user_id', userId)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    return membership?.organization_id ?? null
  }

  if (role === 'client') {
    const { data: access } = await supabase
      .from('project_client_access')
      .select('projects(organization_id)')
      .eq('user_id', userId)
      .eq('status', 'approved')
      .limit(1)
      .maybeSingle()

    const row = access?.projects as
      | { organization_id: string }
      | { organization_id: string }[]
      | null
    if (Array.isArray(row)) return row[0]?.organization_id ?? null
    return row?.organization_id ?? null
  }

  return null
}

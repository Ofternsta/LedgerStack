import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import { assertOrgFeature } from '@/lib/plan-enforcement'
import type { PlanEntitlements } from '@/lib/plan-entitlements'
import type { BillingPlanId } from '@/lib/stripe-config'

export async function requireOrgPlanFeature(
  supabase: SupabaseClient,
  organizationId: string,
  feature: keyof PlanEntitlements,
  featureLabel: string
): Promise<
  | { ok: true; plan: BillingPlanId; entitlements: PlanEntitlements }
  | { ok: false; error: string }
> {
  return assertOrgFeature(supabase, organizationId, feature, featureLabel)
}

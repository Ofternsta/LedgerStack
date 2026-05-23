import type { SupabaseClient } from '@supabase/supabase-js'
import { isTrialExpired } from '@/lib/trial-eligibility'

/** Admin must pick or renew a plan. */
export async function adminNeedsSubscription(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle()

  if (profile?.role !== 'admin') return false

  const { data: org } = await supabase
    .from('organizations')
    .select('id')
    .eq('admin_user_id', userId)
    .maybeSingle()

  if (!org) return false

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('status, plan, trial_ends_at')
    .eq('organization_id', org.id)
    .maybeSingle()

  if (!sub || sub.status === 'pending') return true

  if (sub.status === 'expired') return true

  if (sub.plan === 'trial' && isTrialExpired(sub.trial_ends_at)) {
    await supabase
      .from('subscriptions')
      .update({
        status: 'expired',
        updated_at: new Date().toISOString(),
      })
      .eq('organization_id', org.id)
    return true
  }

  return false
}

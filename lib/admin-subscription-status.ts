import type { SupabaseClient } from '@supabase/supabase-js'
import { isTrialExpired } from '@/lib/trial-utils'

/** Subscription statuses that allow using the app (including grace period for failed payment). */
export function isActiveSubscriptionStatus(
  status: string | null | undefined
): boolean {
  return (
    status === 'active' ||
    status === 'trialing' ||
    status === 'past_due'
  )
}

/** Admin must pick or renew a plan (canceled, expired, trial ended, never subscribed). */
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
    .select('status, plan, trial_ends_at, current_period_end')
    .eq('organization_id', org.id)
    .maybeSingle()

  if (!sub || !isActiveSubscriptionStatus(sub.status)) return true

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

  // Paid access follows Stripe subscription status (webhooks), not local period_end alone.
  // A stale or cleared current_period_end must not revoke founder / promo access early.

  return false
}

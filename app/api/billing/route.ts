import { NextResponse } from 'next/server'
import {
  parseBillingPlan,
  setupAdminSubscription,
} from '@/lib/admin-billing-setup'
import { adminNeedsSubscription } from '@/lib/admin-subscription-status'
import { emailHasUsedTrial } from '@/lib/trial-eligibility'
import { requireAuth } from '@/lib/require-auth'
import { createStripeClient } from '@/lib/stripe-checkout-sessions'
import { getStripeDuplicateSubscriptionsWarning } from '@/lib/stripe-customer-resolve'
import {
  BILLING_PLANS,
  type BillingPlanId,
  isStripeConfigured,
} from '@/lib/stripe-config'
import {
  countApprovedWorkers,
  countCompletedBackups,
  getAiUsageThisMonth,
} from '@/lib/plan-usage'
import {
  formatAiSummariesPerMonth,
  getPlanEntitlements,
  isUnlimited,
} from '@/lib/plan-entitlements'

export async function GET() {
  try {
    const { supabase, user } = await requireAuth()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    }

    const { data: org } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('admin_user_id', user.id)
      .maybeSingle()

    if (!org) {
      return NextResponse.json({ error: 'No organization' }, { status: 404 })
    }

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('organization_id', org.id)
      .maybeSingle()

    const { count: projectCount } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', org.id)

    const needsPlanSelection = await adminNeedsSubscription(supabase, user.id)
    const trialAvailable = user.email
      ? !(await emailHasUsedTrial(user.email))
      : false

    const workerCount = await countApprovedWorkers(supabase, org.id)
    const backupCount = await countCompletedBackups(supabase, org.id)
    const aiUsed = await getAiUsageThisMonth(supabase, org.id)
    const currentPlan = (sub?.plan as BillingPlanId | undefined) || null
    const aiCap = currentPlan
      ? getPlanEntitlements(currentPlan).aiSummariesPerMonth
      : null
    const aiLimit =
      aiCap !== null && !isUnlimited(aiCap) ? aiCap : null
    const aiLimitLabel =
      aiCap !== null ? formatAiSummariesPerMonth(aiCap) : null

    let duplicateSubscriptions = null
    if (isStripeConfigured() && sub?.stripe_customer_id) {
      try {
        const stripe = createStripeClient()
        duplicateSubscriptions = await getStripeDuplicateSubscriptionsWarning(
          stripe,
          {
            organizationId: org.id,
            email: user.email,
            storedCustomerId: sub.stripe_customer_id,
            storedSubscriptionId: sub.stripe_subscription_id,
          }
        )
      } catch (err) {
        console.warn('Stripe duplicate subscription check failed:', err)
      }
    }

    return NextResponse.json({
      plans: BILLING_PLANS,
      subscription: sub,
      needsPlanSelection,
      trialAvailable,
      projectCount: projectCount ?? 0,
      workerCount,
      backupCount,
      aiUsed,
      aiLimit,
      aiLimitLabel,
      stripeConfigured: isStripeConfigured(),
      duplicateSubscriptions,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Billing failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { supabase, user } = await requireAuth()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    }

    const body = await req.json()
    const planId = parseBillingPlan(body.plan)

    if (!planId) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    const { data: org } = await supabase
      .from('organizations')
      .select('id')
      .eq('admin_user_id', user.id)
      .maybeSingle()

    if (!org) {
      return NextResponse.json({ error: 'No organization' }, { status: 404 })
    }

    const trialAvailable = user.email
      ? !(await emailHasUsedTrial(user.email))
      : false

    const billing = await setupAdminSubscription(supabase, {
      organizationId: org.id,
      email: user.email,
      plan: planId,
      allowTrial: trialAvailable,
      successPath:
        typeof body.success_path === 'string' ? body.success_path : undefined,
      cancelPath:
        typeof body.cancel_path === 'string' ? body.cancel_path : undefined,
    })

    if (billing.error) {
      const status =
        billing.error.includes('Stripe') || billing.error.includes('price')
          ? 503
          : 400
      return NextResponse.json({ error: billing.error }, { status })
    }

    if (billing.checkoutUrl) {
      return NextResponse.json({ checkoutUrl: billing.checkoutUrl })
    }

    return NextResponse.json({ ok: true, plan: planId })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Billing update failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

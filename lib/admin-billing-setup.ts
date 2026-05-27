import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import { emailHasUsedTrial } from '@/lib/trial-eligibility'
import {
  BILLING_PLANS,
  type BillingPlanId,
  billingAppUrl,
  isStripeConfigured,
} from '@/lib/stripe-config'
import {
  createStripeCheckoutSession,
  createStripeClient,
  type CheckoutUiMode,
} from '@/lib/stripe-checkout-sessions'

export function parseBillingPlan(raw: unknown): BillingPlanId | null {
  if (typeof raw !== 'string') return null
  if (raw in BILLING_PLANS) return raw as BillingPlanId
  return null
}

export async function setupAdminSubscription(
  supabase: SupabaseClient,
  input: {
    organizationId: string
    email: string | undefined
    plan: BillingPlanId
    successPath?: string
    cancelPath?: string
    allowTrial?: boolean
    uiMode?: CheckoutUiMode
  }
): Promise<{
  checkoutUrl?: string | null
  clientSecret?: string | null
  sessionId?: string
  error?: string | null
}> {
  const { organizationId, email, plan } = input
  const uiMode = input.uiMode ?? 'hosted'
  const successPath = input.successPath ?? '/settings/billing?success=1'
  const cancelPath = input.cancelPath ?? '/settings/billing?canceled=1'

  if (plan === 'trial') {
    if (!input.allowTrial) {
      return {
        error:
          'Free trial is not available for this email. Choose a paid plan.',
      }
    }
  }

  if (!isStripeConfigured()) {
    return {
      error:
        'Card payments require Stripe. Add keys in Vercel — see STRIPE.md.',
    }
  }

  const stripe = createStripeClient()

  const { data: existing } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id, status, plan')
    .eq('organization_id', organizationId)
    .maybeSingle()

  if (
    existing?.status === 'active' &&
    plan !== 'trial' &&
    existing.plan === plan
  ) {
    return { error: 'You are already on this plan.' }
  }

  if (existing?.status === 'active' && plan !== 'trial') {
    return {
      error:
        'To change plans, use Manage payment method or contact support. Cancel in the portal first if needed.',
    }
  }

  let customerId = existing?.stripe_customer_id

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: email ?? undefined,
      metadata: { organization_id: organizationId },
    })
    customerId = customer.id
  }

  const session = await createStripeCheckoutSession(stripe, {
    uiMode,
    plan,
    customerId,
    customerEmail: customerId ? undefined : email,
    successUrl: successPath,
    cancelUrl: cancelPath,
    metadata: { organization_id: organizationId, plan },
    subscriptionMetadata: { organization_id: organizationId, plan },
  })

  const { error } = await supabase.from('subscriptions').upsert(
    {
      organization_id: organizationId,
      plan,
      status: plan === 'trial' ? 'pending' : 'pending',
      stripe_customer_id: customerId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'organization_id' }
  )

  if (error) return { error: error.message }

  return {
    checkoutUrl: session.checkoutUrl,
    clientSecret: session.clientSecret,
    sessionId: session.sessionId,
    error: null,
  }
}

export async function createBillingPortalSession(
  supabase: SupabaseClient,
  organizationId: string,
  returnPath = '/settings/billing'
): Promise<{ url?: string; error?: string }> {
  if (!isStripeConfigured()) {
    return { error: 'Stripe is not configured.' }
  }

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('organization_id', organizationId)
    .maybeSingle()

  if (!sub?.stripe_customer_id) {
    return { error: 'No payment profile yet. Subscribe to a plan first.' }
  }

  const stripe = createStripeClient()
  const appUrl = billingAppUrl()
  const session = await stripe.billingPortal.sessions.create({
    customer: sub.stripe_customer_id,
    return_url: `${appUrl}${returnPath.startsWith('/') ? returnPath : `/${returnPath}`}`,
  })

  return { url: session.url }
}

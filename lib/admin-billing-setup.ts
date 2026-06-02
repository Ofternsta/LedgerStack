import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import { emailHasUsedTrial } from '@/lib/trial-eligibility'
import {
  BILLING_PLANS,
  type BillingPlanId,
  billingAppUrl,
  isStripeConfigured,
  stripePortalConfigurationBillingOnly,
  stripePortalConfigurationPlanChange,
  stripePriceIds,
} from '@/lib/stripe-config'
import {
  createStripeCheckoutSession,
  createStripeClient,
  type CheckoutUiMode,
} from '@/lib/stripe-checkout-sessions'
import {
  resolveStripeBillingContext,
  resolveStripeCustomerId,
} from '@/lib/stripe-customer-resolve'
import { syncStripeSubscription } from '@/lib/stripe-billing'
import { createServiceClient } from '@/lib/supabase/service'

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
    .select('stripe_customer_id, stripe_subscription_id, status, plan')
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
        'You already have an active subscription. Use Settings → Billing → Upgrade or Downgrade to change plans in Stripe.',
    }
  }

  const resolved = await resolveStripeCustomerId(stripe, {
    organizationId,
    email,
    storedCustomerId: existing?.stripe_customer_id,
    storedSubscriptionId: existing?.stripe_subscription_id ?? null,
  })

  let customerId: string
  if ('customerId' in resolved) {
    customerId = resolved.customerId
  } else {
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

export type CreateBillingPortalSessionOptions = {
  returnPath?: string
  adminEmail?: string | null
  /** Opens Stripe portal on the confirm screen for this plan (uses portal proration rules). */
  targetPlan?: BillingPlanId
}

export async function createBillingPortalSession(
  supabase: SupabaseClient,
  organizationId: string,
  options: CreateBillingPortalSessionOptions = {}
): Promise<{ url?: string; error?: string }> {
  if (!isStripeConfigured()) {
    return { error: 'Stripe is not configured.' }
  }

  const returnPath = options.returnPath ?? '/settings/billing'
  const returnUrlBase = `${billingAppUrl()}${
    returnPath.startsWith('/') ? returnPath : `/${returnPath}`
  }`

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id, stripe_subscription_id')
    .eq('organization_id', organizationId)
    .maybeSingle()

  const stripe = createStripeClient()
  const billing = await resolveStripeBillingContext(stripe, {
    organizationId,
    email: options.adminEmail,
    storedCustomerId: sub?.stripe_customer_id,
    storedSubscriptionId: sub?.stripe_subscription_id,
  })

  if ('error' in billing) {
    return { error: billing.error }
  }

  const { customerId, subscription, repairedStoredIds } = billing.context
  const subscriptionId = subscription.id
  const itemId = subscription.items.data[0]?.id

  if (repairedStoredIds) {
    const service = createServiceClient()
    const { error: updateError } = await service
      .from('subscriptions')
      .update({
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        updated_at: new Date().toISOString(),
      })
      .eq('organization_id', organizationId)

    if (updateError) {
      console.warn(
        'Could not persist repaired Stripe IDs:',
        updateError.message
      )
    }

    try {
      await syncStripeSubscription(subscription)
    } catch (err) {
      console.warn('Stripe subscription sync after ID repair failed:', err)
    }
  }

  const afterReturnUrl = `${returnUrlBase}?portal=1&updated=1`

  if (options.targetPlan && options.targetPlan !== 'trial') {
    const targetPriceId = stripePriceIds()[options.targetPlan]
    if (!targetPriceId) {
      return {
        error: `Stripe price not configured for ${options.targetPlan}.`,
      }
    }

    if (!itemId) {
      return { error: 'Could not load subscription for plan change.' }
    }

    const planChangeConfig = stripePortalConfigurationPlanChange()
    const planPortalBase = planChangeConfig
      ? { configuration: planChangeConfig }
      : {}

    try {
      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrlBase,
        ...planPortalBase,
        flow_data: {
          type: 'subscription_update_confirm',
          subscription_update_confirm: {
            subscription: subscriptionId,
            items: [{ id: itemId, price: targetPriceId, quantity: 1 }],
          },
          after_completion: {
            type: 'redirect',
            redirect: { return_url: afterReturnUrl },
          },
        },
      })
      return { url: session.url }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : ''
      if (!message.includes('No such subscription')) {
        throw err
      }
      console.warn(
        'Portal confirm flow failed; falling back to plan picker:',
        message
      )
      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrlBase,
        ...planPortalBase,
        flow_data: {
          type: 'subscription_update',
          subscription_update: { subscription: subscriptionId },
          after_completion: {
            type: 'redirect',
            redirect: { return_url: afterReturnUrl },
          },
        },
      })
      return { url: session.url }
    }
  }

  const billingOnlyConfig = stripePortalConfigurationBillingOnly()
  if (billingOnlyConfig) {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrlBase,
      configuration: billingOnlyConfig,
    })
    return { url: session.url }
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrlBase,
    flow_data: {
      type: 'payment_method_update',
    },
  })

  return { url: session.url }
}

export async function cancelOrganizationSubscription(
  supabase: SupabaseClient,
  organizationId: string,
  adminEmail?: string | null
): Promise<
  | { ok: true; endsAt: string | null; alreadyScheduled: boolean }
  | { error: string }
> {
  if (!isStripeConfigured()) {
    return { error: 'Stripe is not configured.' }
  }

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id, stripe_subscription_id, status')
    .eq('organization_id', organizationId)
    .maybeSingle()

  const status = sub?.status
  if (
    !status ||
    (status !== 'active' && status !== 'trialing' && status !== 'past_due')
  ) {
    return { error: 'No active subscription to cancel.' }
  }

  const stripe = createStripeClient()
  const billing = await resolveStripeBillingContext(stripe, {
    organizationId,
    email: adminEmail,
    storedCustomerId: sub?.stripe_customer_id,
    storedSubscriptionId: sub?.stripe_subscription_id,
  })

  if ('error' in billing) {
    return { error: billing.error }
  }

  const { customerId, subscription, repairedStoredIds } = billing.context
  const subscriptionId = subscription.id

  if (subscription.cancel_at_period_end) {
    const unix = subscription.items.data[0]?.current_period_end
    const endsAt =
      typeof unix === 'number' ? new Date(unix * 1000).toISOString() : null
    return { ok: true, endsAt, alreadyScheduled: true }
  }

  const updated = await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  })

  if (repairedStoredIds) {
    const service = createServiceClient()
    await service
      .from('subscriptions')
      .update({
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        updated_at: new Date().toISOString(),
      })
      .eq('organization_id', organizationId)
  }

  await syncStripeSubscription(updated)

  const unix = updated.items.data[0]?.current_period_end
  const endsAt =
    typeof unix === 'number' ? new Date(unix * 1000).toISOString() : null

  return { ok: true, endsAt, alreadyScheduled: false }
}

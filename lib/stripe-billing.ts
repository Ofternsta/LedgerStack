import 'server-only'

import Stripe from 'stripe'
import type { Stripe as StripeTypes } from 'stripe'
import { createServiceClient } from '@/lib/supabase/service'
import { isActiveSubscriptionStatus } from '@/lib/admin-subscription-status'
import {
  type BillingPlanId,
  planFromStripePriceId,
  trialEndsAtFromNow,
} from '@/lib/stripe-config'

type SubscriptionStatus =
  | 'pending'
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'

function mapStripeStatus(status: StripeTypes.Subscription.Status): SubscriptionStatus {
  if (status === 'active') return 'active'
  if (status === 'trialing') return 'trialing'
  if (status === 'past_due' || status === 'unpaid') return 'past_due'
  if (status === 'canceled' || status === 'incomplete_expired') return 'canceled'
  if (status === 'incomplete') return 'pending'
  if (status === 'paused') return 'active'
  return 'canceled'
}

function subscriptionPeriodEndUnix(
  subscription: StripeTypes.Subscription
): number | null {
  const unix = subscription.items.data[0]?.current_period_end
  return typeof unix === 'number' ? unix : null
}

function subscriptionPeriodEndIso(subscription: StripeTypes.Subscription): string | null {
  const unix = subscriptionPeriodEndUnix(subscription)
  if (unix === null) return null
  return new Date(unix * 1000).toISOString()
}

/** Map Stripe status without kicking users off on transient webhook downgrades. */
function resolveSubscriptionStatus(
  subscription: StripeTypes.Subscription,
  existingStatus?: string | null
): SubscriptionStatus {
  const periodEndUnix = subscriptionPeriodEndUnix(subscription)
  if (
    subscription.cancel_at_period_end &&
    periodEndUnix !== null &&
    periodEndUnix * 1000 > Date.now()
  ) {
    return 'active'
  }

  const mapped = mapStripeStatus(subscription.status)

  if (!isActiveSubscriptionStatus(existingStatus)) {
    return mapped
  }

  if (
    subscription.status === 'canceled' ||
    subscription.status === 'incomplete_expired'
  ) {
    return mapped
  }

  if (
    mapped === 'canceled' ||
    mapped === 'pending' ||
    subscription.status === 'incomplete' ||
    subscription.status === 'paused'
  ) {
    return existingStatus as SubscriptionStatus
  }

  return mapped
}

export async function upsertSubscriptionFromStripe(input: {
  organizationId: string
  plan: BillingPlanId
  status: SubscriptionStatus
  stripeCustomerId?: string | null
  stripeSubscriptionId?: string | null
  currentPeriodEnd?: string | null
  trialEndsAt?: string | null
}) {
  const supabase = createServiceClient()

  const { error } = await supabase.from('subscriptions').upsert(
    {
      organization_id: input.organizationId,
      plan: input.plan,
      status: input.status,
      stripe_customer_id: input.stripeCustomerId ?? null,
      stripe_subscription_id: input.stripeSubscriptionId ?? null,
      current_period_end: input.currentPeriodEnd ?? null,
      trial_ends_at: input.trialEndsAt ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'organization_id' }
  )

  if (error) throw new Error(error.message)
}

export async function syncStripeSubscription(subscription: StripeTypes.Subscription) {
  const customerId =
    typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer.id

  const supabase = createServiceClient()
  const { data: row } = await supabase
    .from('subscriptions')
    .select('organization_id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle()

  const organizationId =
    row?.organization_id ||
    (subscription.metadata?.organization_id as string | undefined)

  if (!organizationId) {
    console.warn(
      'Stripe subscription update: no organization for customer',
      customerId
    )
    return
  }

  const priceId = subscription.items.data[0]?.price?.id
  const planFromPrice = priceId ? planFromStripePriceId(priceId) : null
  const plan =
    planFromPrice ||
    (subscription.metadata?.plan as BillingPlanId | undefined) ||
    'starter'

  const { data: existing } = await supabase
    .from('subscriptions')
    .select('status, current_period_end')
    .eq('organization_id', organizationId)
    .maybeSingle()

  const periodEnd =
    subscriptionPeriodEndIso(subscription) ?? existing?.current_period_end ?? null

  await upsertSubscriptionFromStripe({
    organizationId,
    plan,
    status: resolveSubscriptionStatus(subscription, existing?.status),
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
    currentPeriodEnd: periodEnd,
  })
}

export async function handleCheckoutSessionCompleted(
  session: StripeTypes.Checkout.Session
) {
  const pendingSignupId = session.metadata?.pending_signup_id

  if (pendingSignupId) {
    const stripeKey = process.env.STRIPE_SECRET_KEY
    if (!stripeKey) {
      console.error('STRIPE_SECRET_KEY missing — cannot fulfill pending signup')
      throw new Error('Stripe not configured')
    }
    const stripe = new Stripe(stripeKey)
    const { getCheckoutPaymentFingerprint } = await import(
      '@/lib/stripe-payment-fingerprint'
    )
    const { fulfillPendingAdminSignup } = await import('@/lib/register-admin')

    const fingerprint = await getCheckoutPaymentFingerprint(stripe, session)

    const customerId =
      typeof session.customer === 'string'
        ? session.customer
        : session.customer?.id ?? null

    console.info(
      'Fulfilling pending signup',
      pendingSignupId,
      session.metadata?.plan
    )

    const subscriptionId =
      typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription?.id ?? null

    const result = await fulfillPendingAdminSignup(pendingSignupId, {
      paymentMethodFingerprint: fingerprint,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      allowExpired: true,
    })

    if (subscriptionId) {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId)
      await syncStripeSubscription(subscription)
    }

    console.info('Pending signup fulfill result', pendingSignupId, result)
    return
  }

  const organizationId = session.metadata?.organization_id
  const plan = session.metadata?.plan as BillingPlanId | undefined

  if (!organizationId || !plan) {
    console.warn('Checkout completed without organization_id or plan metadata')
    return
  }

  const customerId =
    typeof session.customer === 'string'
      ? session.customer
      : session.customer?.id

  const subscriptionId =
    typeof session.subscription === 'string'
      ? session.subscription
      : session.subscription?.id

  const isTrial = plan === 'trial'

  await upsertSubscriptionFromStripe({
    organizationId,
    plan,
    status: isTrial ? 'trialing' : 'active',
    stripeCustomerId: customerId ?? null,
    stripeSubscriptionId: subscriptionId ?? null,
    trialEndsAt: isTrial ? trialEndsAtFromNow() : null,
  })
}

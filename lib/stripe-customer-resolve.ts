import 'server-only'

import type Stripe from 'stripe'
import {
  BILLING_PLANS,
  type BillingPlanId,
  planFromStripePriceId,
} from '@/lib/stripe-config'

export type ResolveStripeCustomerInput = {
  organizationId: string
  email?: string | null
  storedCustomerId?: string | null
  storedSubscriptionId?: string | null
}

function stripeCustomerMissing(message: string) {
  return (
    message.includes('No such customer') ||
    message.includes('a similar object exists in test mode') ||
    message.includes('a similar object exists in live mode')
  )
}

export function stripeResourceMissing(message: string) {
  return (
    stripeCustomerMissing(message) ||
    message.includes('No such subscription') ||
    message.includes('No such payment_intent')
  )
}

const BILLABLE_SUBSCRIPTION_STATUSES = new Set<Stripe.Subscription.Status>([
  'active',
  'trialing',
  'past_due',
])

function isBillableSubscription(subscription: Stripe.Subscription) {
  return BILLABLE_SUBSCRIPTION_STATUSES.has(subscription.status)
}

function pickBillableSubscription(
  subscriptions: Stripe.Subscription[],
  preferredId?: string | null
) {
  const billable = subscriptions.filter((s) => isBillableSubscription(s))
  if (!billable.length) return null
  if (preferredId) {
    const preferred = billable.find((s) => s.id === preferredId)
    if (preferred) return preferred
  }
  return billable.sort((a, b) => b.created - a.created)[0]
}

function subscriptionPlanLabel(subscription: Stripe.Subscription): string {
  const priceId = subscription.items.data[0]?.price?.id
  const planId = priceId ? planFromStripePriceId(priceId) : null
  if (planId && planId in BILLING_PLANS) {
    return BILLING_PLANS[planId as BillingPlanId].name
  }
  const product = subscription.items.data[0]?.price?.product
  if (typeof product === 'object' && product && 'name' in product && product.name) {
    return String(product.name)
  }
  return 'Subscription'
}

async function collectCandidateCustomerIds(
  stripe: Stripe,
  input: ResolveStripeCustomerInput
): Promise<string[]> {
  const { organizationId, email, storedCustomerId, storedSubscriptionId } =
    input

  const candidateCustomerIds: string[] = []
  const seen = new Set<string>()

  addCustomerId(candidateCustomerIds, seen, storedCustomerId)

  try {
    const byOrg = await stripe.customers.search({
      query: `metadata['organization_id']:'${organizationId}'`,
      limit: 10,
    })
    for (const customer of byOrg.data) {
      addCustomerId(candidateCustomerIds, seen, customer.id)
    }
  } catch {
    // Customer search may be unavailable on some accounts.
  }

  if (email) {
    const listed = await stripe.customers.list({ email, limit: 20 })
    const orgMatch = listed.data.find(
      (c) => c.metadata?.organization_id === organizationId
    )
    if (orgMatch) {
      addCustomerId(candidateCustomerIds, seen, orgMatch.id)
    }
    for (const customer of listed.data) {
      addCustomerId(candidateCustomerIds, seen, customer.id)
    }
  }

  if (storedSubscriptionId) {
    try {
      const subscription = await stripe.subscriptions.retrieve(
        storedSubscriptionId
      )
      const customerId =
        typeof subscription.customer === 'string'
          ? subscription.customer
          : subscription.customer?.id
      addCustomerId(candidateCustomerIds, seen, customerId)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : ''
      if (!stripeResourceMissing(message)) {
        throw err
      }
    }
  }

  return candidateCustomerIds
}

export type StripeActiveSubscriptionSummary = {
  id: string
  planLabel: string
  status: string
  created: string
  isPreferred: boolean
}

export type StripeDuplicateSubscriptionsWarning = {
  message: string
  activeSubscriptions: StripeActiveSubscriptionSummary[]
  preferredSubscriptionId: string | null
}

/** List billable subscriptions across Stripe customers tied to this org. */
export async function listBillableStripeSubscriptionsForOrganization(
  stripe: Stripe,
  input: ResolveStripeCustomerInput
): Promise<Stripe.Subscription[]> {
  const candidateCustomerIds = await collectCandidateCustomerIds(stripe, input)
  const byId = new Map<string, Stripe.Subscription>()

  for (const customerId of candidateCustomerIds) {
    try {
      const listed = await stripe.subscriptions.list({
        customer: customerId,
        status: 'all',
        limit: 20,
      })
      for (const subscription of listed.data) {
        if (isBillableSubscription(subscription)) {
          byId.set(subscription.id, subscription)
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : ''
      if (stripeCustomerMissing(message)) continue
      if (!stripeResourceMissing(message)) {
        throw err
      }
    }
  }

  return [...byId.values()].sort((a, b) => b.created - a.created)
}

export async function getStripeDuplicateSubscriptionsWarning(
  stripe: Stripe,
  input: ResolveStripeCustomerInput
): Promise<StripeDuplicateSubscriptionsWarning | null> {
  const active = await listBillableStripeSubscriptionsForOrganization(
    stripe,
    input
  )
  if (active.length <= 1) return null

  const preferredId =
    input.storedSubscriptionId &&
    active.some((s) => s.id === input.storedSubscriptionId)
      ? input.storedSubscriptionId
      : active[0]?.id ?? null

  const summaries: StripeActiveSubscriptionSummary[] = active.map((s) => ({
    id: s.id,
    planLabel: subscriptionPlanLabel(s),
    status: s.status,
    created: new Date(s.created * 1000).toISOString(),
    isPreferred: s.id === preferredId,
  }))

  return {
    message:
      'Stripe shows more than one active subscription for this account. LedgerStack uses the subscription saved in billing (marked below). Cancel the extra subscription(s) in the Stripe Dashboard so you are not charged twice.',
    activeSubscriptions: summaries,
    preferredSubscriptionId: preferredId,
  }
}

function addCustomerId(ids: string[], seen: Set<string>, id: string | null | undefined) {
  if (id && !seen.has(id)) {
    seen.add(id)
    ids.push(id)
  }
}

export type StripeBillingContext = {
  customerId: string
  subscription: Stripe.Subscription
  repairedStoredIds: boolean
}

/** Find the live Stripe customer + billable subscription for an organization. */
export async function resolveStripeBillingContext(
  stripe: Stripe,
  input: ResolveStripeCustomerInput
): Promise<
  | { context: StripeBillingContext }
  | { error: string; staleModeMismatch?: boolean }
> {
  const { organizationId, storedCustomerId, storedSubscriptionId } = input

  let candidateCustomerIds: string[]
  try {
    candidateCustomerIds = await collectCandidateCustomerIds(stripe, input)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : ''
    return { error: message || 'Could not load subscription' }
  }

  type CandidateMatch = {
    customerId: string
    subscription: Stripe.Subscription
    orgMatch: boolean
  }

  let best: CandidateMatch | null = null

  for (const customerId of candidateCustomerIds) {
    try {
      const customer = await stripe.customers.retrieve(customerId)
      if (customer.deleted) continue

      const listed = await stripe.subscriptions.list({
        customer: customerId,
        status: 'all',
        limit: 20,
      })

      const subscription = pickBillableSubscription(
        listed.data,
        storedSubscriptionId
      )
      if (!subscription) continue

      const orgMatch =
        customer.metadata?.organization_id === organizationId ||
        subscription.metadata?.organization_id === organizationId

      const match: CandidateMatch = { customerId, subscription, orgMatch }

      if (!best || (orgMatch && !best.orgMatch)) {
        best = match
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : ''
      if (stripeCustomerMissing(message)) continue
      if (!stripeResourceMissing(message)) {
        return { error: message || 'Could not load billing profile' }
      }
    }
  }

  if (best) {
    return {
      context: {
        customerId: best.customerId,
        subscription: best.subscription,
        repairedStoredIds:
          storedCustomerId !== best.customerId ||
          storedSubscriptionId !== best.subscription.id,
      },
    }
  }

  if (storedCustomerId || storedSubscriptionId) {
    return {
      error:
        'Your billing profile was created in Stripe test mode, but this site uses live payments (or the opposite). Choose a plan below to set up billing again for this environment.',
      staleModeMismatch: true,
    }
  }

  return {
    error:
      'No active subscription found in Stripe. Open Billing and subscribe to a plan, or contact support.',
  }
}

export type ResolveStripeSubscriptionInput = {
  customerId: string
  storedSubscriptionId?: string | null
}

/** @deprecated Prefer resolveStripeBillingContext */
export async function resolveStripeSubscription(
  stripe: Stripe,
  input: ResolveStripeSubscriptionInput
): Promise<
  | { subscription: Stripe.Subscription; repairedFromStoredId?: string }
  | { error: string }
> {
  const listed = await stripe.subscriptions.list({
    customer: input.customerId,
    status: 'all',
    limit: 20,
  })

  const best = pickBillableSubscription(listed.data)
  if (!best) {
    return {
      error:
        'No subscription found in Stripe for this account. Use Billing to subscribe again.',
    }
  }

  return {
    subscription: best,
    repairedFromStoredId:
      input.storedSubscriptionId && input.storedSubscriptionId !== best.id
        ? input.storedSubscriptionId
        : undefined,
  }
}

/** Resolve a Stripe customer in the current API key mode (live vs test). */
export async function resolveStripeCustomerId(
  stripe: Stripe,
  input: ResolveStripeCustomerInput
): Promise<{ customerId: string } | { error: string; staleModeMismatch?: boolean }> {
  const { organizationId, email, storedCustomerId, storedSubscriptionId } =
    input

  if (storedCustomerId) {
    try {
      const customer = await stripe.customers.retrieve(storedCustomerId)
      if (!customer.deleted) {
        return { customerId: customer.id }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : ''
      if (!stripeCustomerMissing(message)) {
        return { error: message || 'Could not load billing profile' }
      }
    }
  }

  if (storedSubscriptionId) {
    try {
      const subscription = await stripe.subscriptions.retrieve(
        storedSubscriptionId
      )
      const customerId =
        typeof subscription.customer === 'string'
          ? subscription.customer
          : subscription.customer?.id
      if (customerId) {
        return { customerId }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : ''
      if (!stripeResourceMissing(message)) {
        return { error: message || 'Could not load subscription' }
      }
    }
  }

  try {
    const byOrg = await stripe.customers.search({
      query: `metadata['organization_id']:'${organizationId}'`,
      limit: 5,
    })
    if (byOrg.data[0]) {
      return { customerId: byOrg.data[0].id }
    }
  } catch {
    // ignore
  }

  if (email) {
    const listed = await stripe.customers.list({ email, limit: 20 })
    const byOrg = listed.data.find(
      (c) => c.metadata?.organization_id === organizationId
    )
    if (byOrg) {
      return { customerId: byOrg.id }
    }
    if (listed.data.length === 1) {
      return { customerId: listed.data[0].id }
    }
  }

  if (storedCustomerId || storedSubscriptionId) {
    return {
      error:
        'Your billing profile was created in Stripe test mode, but this site uses live payments (or the opposite). Choose a plan below to set up billing again for this environment.',
      staleModeMismatch: true,
    }
  }

  return {
    error: 'No payment profile yet. Subscribe to a plan first.',
  }
}

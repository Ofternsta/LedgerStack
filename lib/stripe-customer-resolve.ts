import 'server-only'

import type Stripe from 'stripe'

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

function pickBillableSubscription(subscriptions: Stripe.Subscription[]) {
  return (
    subscriptions
      .filter((s) => BILLABLE_SUBSCRIPTION_STATUSES.has(s.status))
      .sort((a, b) => b.created - a.created)[0] ?? null
  )
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
    // Customer search may be unavailable on some accounts; email listing still works.
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
        return { error: message || 'Could not load subscription' }
      }
    }
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

      const subscription = pickBillableSubscription(listed.data)
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

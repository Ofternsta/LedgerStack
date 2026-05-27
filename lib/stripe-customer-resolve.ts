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

function stripeResourceMissing(message: string) {
  return (
    stripeCustomerMissing(message) ||
    message.includes('No such subscription') ||
    message.includes('No such payment_intent')
  )
}

/** Resolve a Stripe customer in the current API key mode (live vs test). */
export async function resolveStripeCustomerId(
  stripe: Stripe,
  input: ResolveStripeCustomerInput
): Promise<{ customerId: string } | { error: string; staleModeMismatch?: boolean }> {
  const { organizationId, email, storedCustomerId, storedSubscriptionId } = input

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

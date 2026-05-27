import 'server-only'

import type Stripe from 'stripe'
import {
  type BillingPlanId,
  stripePriceIds,
  stripeProductStatementDescriptor,
} from '@/lib/stripe-config'

/** Subscription charges use each Product's statement_descriptor — keep it branded. */
export async function ensureStripeProductStatementDescriptor(
  stripe: Stripe,
  plan: Exclude<BillingPlanId, 'trial'>
) {
  const priceId = stripePriceIds()[plan]
  if (!priceId) return

  try {
    const price = await stripe.prices.retrieve(priceId)
    const productId =
      typeof price.product === 'string' ? price.product : price.product?.id
    if (!productId) return

    const descriptor = stripeProductStatementDescriptor()
    await stripe.products.update(productId, {
      statement_descriptor: descriptor,
    })
  } catch (err) {
    console.warn('Stripe product statement_descriptor update failed:', err)
  }
}

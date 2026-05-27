import 'server-only'

import type Stripe from 'stripe'
import {
  getPlanStripeDescription,
  getPlanStripeProductName,
} from '@/lib/plan-entitlements'
import {
  BILLING_PLANS,
  type BillingPlanId,
  stripePriceIds,
  stripeProductStatementDescriptor,
} from '@/lib/stripe-config'

/** Keep Stripe Product name + description in sync with ledgerstack.org pricing copy. */
export async function ensureStripeProductBranding(
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

    const planLabel = BILLING_PLANS[plan].name
    await stripe.products.update(productId, {
      name: getPlanStripeProductName(plan, planLabel),
      description: getPlanStripeDescription(plan),
      statement_descriptor: stripeProductStatementDescriptor(),
    })
  } catch (err) {
    console.warn('Stripe product branding update failed:', err)
  }
}

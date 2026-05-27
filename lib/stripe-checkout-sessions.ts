import 'server-only'

import Stripe from 'stripe'
import {
  type BillingPlanId,
  billingAppUrl,
  stripeCheckoutBranding,
  stripeCheckoutPaymentIntentBranding,
  stripePriceIds,
} from '@/lib/stripe-config'
import { ensureStripeProductBranding } from '@/lib/stripe-product-branding'

export type CheckoutUiMode = 'hosted' | 'embedded'

export type CreateCheckoutSessionInput = {
  uiMode: CheckoutUiMode
  plan: BillingPlanId
  customerId?: string | null
  customerEmail?: string | null
  successUrl: string
  cancelUrl: string
  metadata: Record<string, string>
  subscriptionMetadata?: Record<string, string>
}

export type CheckoutSessionResult = {
  sessionId: string
  checkoutUrl?: string | null
  clientSecret?: string | null
}

function absoluteUrl(path: string) {
  const appUrl = billingAppUrl()
  return `${appUrl}${path.startsWith('/') ? path : `/${path}`}`
}

export async function createStripeCheckoutSession(
  stripe: Stripe,
  input: CreateCheckoutSessionInput
): Promise<CheckoutSessionResult> {
  const isEmbedded = input.uiMode === 'embedded'

  const base = {
    ...stripeCheckoutBranding(),
    ...(input.customerId
      ? { customer: input.customerId }
      : input.customerEmail
        ? { customer_email: input.customerEmail }
        : {}),
    metadata: input.metadata,
    ...(isEmbedded
      ? {
          ui_mode: 'embedded' as const,
          return_url: absoluteUrl(input.successUrl),
        }
      : {
          success_url: absoluteUrl(input.successUrl),
          cancel_url: absoluteUrl(input.cancelUrl),
        }),
  }

  if (input.plan === 'trial') {
    const session = await stripe.checkout.sessions.create({
      ...base,
      ...stripeCheckoutPaymentIntentBranding(),
      mode: 'setup',
      payment_method_types: ['card'],
    })

    return {
      sessionId: session.id,
      checkoutUrl: isEmbedded ? null : session.url,
      clientSecret: isEmbedded ? session.client_secret : null,
    }
  }

  const priceId = stripePriceIds()[input.plan]
  if (!priceId) {
    throw new Error(`Stripe price not configured for ${input.plan}.`)
  }

  await ensureStripeProductBranding(stripe, input.plan)

  const session = await stripe.checkout.sessions.create({
    ...base,
    ...stripeCheckoutPaymentIntentBranding(),
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: {
      metadata: input.subscriptionMetadata ?? input.metadata,
    },
  })

  return {
    sessionId: session.id,
    checkoutUrl: isEmbedded ? null : session.url,
    clientSecret: isEmbedded ? session.client_secret : null,
  }
}

export function createStripeClient() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY is not configured')
  return new Stripe(key)
}

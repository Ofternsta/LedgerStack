export const TRIAL_DAYS = 7

export function trialEndsAtFromNow() {
  return new Date(
    Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000
  ).toISOString()
}

export const BILLING_PLANS = {
  trial: { name: 'Trial', price: 0, projects: 2, days: TRIAL_DAYS },
  starter: { name: 'Starter', price: 20, projects: 25 },
  professional: { name: 'Professional', price: 70, projects: 100 },
  enterprise: { name: 'Enterprise', price: 150, projects: -1 },
} as const

export type BillingPlanId = keyof typeof BILLING_PLANS

export function stripePriceIds(): Record<
  Exclude<BillingPlanId, 'trial'>,
  string | undefined
> {
  return {
    starter: process.env.STRIPE_PRICE_STARTER,
    professional: process.env.STRIPE_PRICE_PROFESSIONAL,
    enterprise: process.env.STRIPE_PRICE_ENTERPRISE,
  }
}

export function planFromStripePriceId(priceId: string): BillingPlanId | null {
  const map = stripePriceIds()
  for (const [plan, id] of Object.entries(map)) {
    if (id && id === priceId) return plan as BillingPlanId
  }
  return null
}

export function stripePublishableKey(): string | undefined {
  return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() || undefined
}

export function isStripeConfigured(): boolean {
  const prices = stripePriceIds()
  return Boolean(
    process.env.STRIPE_SECRET_KEY &&
      stripePublishableKey() &&
      prices.starter &&
      prices.professional &&
      prices.enterprise
  )
}

export function billingAppUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ||
    'https://ledgerstack.org'
  )
}

/** Name shown at the top of Stripe Checkout (overrides Dashboard business name). */
export function stripeCheckoutDisplayName(): string {
  return process.env.STRIPE_CHECKOUT_DISPLAY_NAME?.trim() || 'LedgerStack'
}

/** Card statement text for subscription products (max 22 characters). */
export function stripeProductStatementDescriptor(): string {
  const raw =
    process.env.STRIPE_STATEMENT_DESCRIPTOR?.trim() || 'LedgerStack'
  return raw.slice(0, 22)
}

/**
 * Suffix appended to the account statement-descriptor prefix on card charges.
 * Keep short; full line is often "PREFIX* SUFFIX" (22 chars total).
 */
export function stripeStatementDescriptorSuffix(): string {
  const raw =
    process.env.STRIPE_STATEMENT_DESCRIPTOR_SUFFIX?.trim() || 'LEDGERSTACK'
  return raw.slice(0, 22)
}

export function stripeCheckoutBranding(): {
  branding_settings: { display_name: string }
} {
  return {
    branding_settings: {
      display_name: stripeCheckoutDisplayName(),
    },
  }
}

/** Card charges from Checkout (trial card verify, etc.). */
export function stripeCheckoutPaymentIntentBranding(): {
  payment_intent_data: { statement_descriptor_suffix: string }
} {
  return {
    payment_intent_data: {
      statement_descriptor_suffix: stripeStatementDescriptorSuffix(),
    },
  }
}

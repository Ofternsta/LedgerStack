export const BILLING_PLANS = {
  trial: { name: 'Trial', price: 0, projects: 3 },
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

export function isStripeConfigured(): boolean {
  const prices = stripePriceIds()
  return Boolean(
    process.env.STRIPE_SECRET_KEY &&
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

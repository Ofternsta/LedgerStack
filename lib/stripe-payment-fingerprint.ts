import 'server-only'

import type Stripe from 'stripe'
import { createServiceClient } from '@/lib/supabase/service'

export async function getCheckoutPaymentFingerprint(
  stripe: Stripe,
  session: Stripe.Checkout.Session
): Promise<string | null> {
  try {
    if (session.mode === 'setup' && session.setup_intent) {
      const setupIntentId =
        typeof session.setup_intent === 'string'
          ? session.setup_intent
          : session.setup_intent.id

      const setupIntent = await stripe.setupIntents.retrieve(setupIntentId)
      const paymentMethodId =
        typeof setupIntent.payment_method === 'string'
          ? setupIntent.payment_method
          : setupIntent.payment_method?.id

      if (!paymentMethodId) return null

      const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId)
      return paymentMethod.card?.fingerprint ?? null
    }

    if (session.mode === 'subscription' && session.subscription) {
      const subscriptionId =
        typeof session.subscription === 'string'
          ? session.subscription
          : session.subscription.id

      const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
        expand: ['default_payment_method'],
      })

      const pm = subscription.default_payment_method
      if (pm && typeof pm !== 'string' && pm.card?.fingerprint) {
        return pm.card.fingerprint
      }
    }
  } catch (err) {
    console.error('Could not read payment method fingerprint:', err)
  }

  return null
}

export async function paymentFingerprintHasUsedTrial(
  fingerprint: string
): Promise<boolean> {
  const service = createServiceClient()
  const { data } = await service
    .from('trial_payment_fingerprints')
    .select('fingerprint')
    .eq('fingerprint', fingerprint)
    .maybeSingle()

  return Boolean(data?.fingerprint)
}

export async function registerPaymentFingerprintTrial(
  fingerprint: string,
  email: string,
  trialEndsAt: string
) {
  const service = createServiceClient()
  const { error } = await service.from('trial_payment_fingerprints').insert({
    fingerprint,
    email: email.trim().toLowerCase(),
    trial_ends_at: trialEndsAt,
  })

  if (error) throw new Error(error.message)
}

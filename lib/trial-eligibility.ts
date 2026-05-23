import 'server-only'

import { paymentFingerprintHasUsedTrial } from '@/lib/stripe-payment-fingerprint'
import { trialEndsAtFromNow } from '@/lib/stripe-config'
import { createServiceClient } from '@/lib/supabase/service'
import {
  isTrialExpired,
  normalizeSignupEmail,
  trialDaysLabel,
} from '@/lib/trial-utils'

export { isTrialExpired, normalizeSignupEmail, trialDaysLabel }

/** True if this email already used a free trial. */
export async function emailHasUsedTrial(email: string): Promise<boolean> {
  const service = createServiceClient()
  const normalized = normalizeSignupEmail(email)
  const { data } = await service
    .from('email_trial_registry')
    .select('email')
    .eq('email', normalized)
    .maybeSingle()

  return Boolean(data?.email)
}

export async function registerEmailTrial(email: string) {
  const service = createServiceClient()
  const normalized = normalizeSignupEmail(email)
  const trialEndsAt = trialEndsAtFromNow()

  const { error } = await service.from('email_trial_registry').insert({
    email: normalized,
    trial_ends_at: trialEndsAt,
  })

  if (error) throw new Error(error.message)
  return trialEndsAt
}

/** Email or card fingerprint already consumed a trial. */
export async function trialSignupBlocked(input: {
  email: string
  paymentFingerprint?: string | null
}): Promise<{ blocked: boolean; reason?: string }> {
  if (await emailHasUsedTrial(input.email)) {
    return {
      blocked: true,
      reason:
        'This email already used a free trial. Choose a paid plan to continue.',
    }
  }

  if (input.paymentFingerprint) {
    if (await paymentFingerprintHasUsedTrial(input.paymentFingerprint)) {
      return {
        blocked: true,
        reason:
          'This payment method already used a free trial. Use a different card or choose a paid plan.',
      }
    }
  }

  return { blocked: false }
}

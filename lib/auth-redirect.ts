import type { BillingPlanId } from '@/lib/stripe-config'
import { billingAppUrl } from '@/lib/stripe-config'

/** Supabase Auth redirect after email link (signup, recovery, etc.). */
export function authCallbackRedirectUrl(nextPath: string) {
  const appUrl = billingAppUrl()
  const next = encodeURIComponent(nextPath)
  return `${appUrl}/auth/callback?next=${next}`
}

export function passwordResetRedirectUrl() {
  return authCallbackRedirectUrl('/login/reset-password')
}

export function emailVerificationRedirectUrl(nextPath = '/login?verified=1') {
  return authCallbackRedirectUrl(nextPath)
}

/** After admin signup email confirm — do not send users to login. */
export function signupEmailVerifiedNextPath(
  plan: BillingPlanId,
  email?: string | null
) {
  const params = new URLSearchParams({ plan })
  const normalized = email?.trim().toLowerCase()
  if (normalized) params.set('email', normalized)
  return `/onboarding/email-verified?${params.toString()}`
}

/** Checkout during admin signup (keeps email when opening a new tab). */
export function signupCheckoutPath(plan: BillingPlanId, email?: string | null) {
  const params = new URLSearchParams({ plan, register: '1' })
  const normalized = email?.trim().toLowerCase()
  if (normalized) params.set('email', normalized)
  return `/checkout?${params.toString()}`
}

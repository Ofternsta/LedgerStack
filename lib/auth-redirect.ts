import type { BillingPlanId } from '@/lib/stripe-config'
import { billingAppUrl } from '@/lib/stripe-config'

/** Where Supabase sends users after they click the email confirmation link. */
export function authConfirmRedirectUrl(nextPath: string) {
  const appUrl = billingAppUrl()
  const params = new URLSearchParams({ next: nextPath })
  return `${appUrl}/auth/confirm?${params.toString()}`
}

/** @deprecated Use authConfirmRedirectUrl — kept for older links */
export function authCallbackRedirectUrl(nextPath: string) {
  return authConfirmRedirectUrl(nextPath)
}

export function passwordResetRedirectUrl() {
  return authCallbackRedirectUrl('/login/reset-password')
}

export function emailVerificationRedirectUrl(nextPath = '/login?verified=1') {
  return authConfirmRedirectUrl(nextPath)
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

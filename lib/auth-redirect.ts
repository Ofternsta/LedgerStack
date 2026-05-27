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

import { TRIAL_DAYS } from '@/lib/stripe-config'

export function normalizeSignupEmail(email: string) {
  return email.trim().toLowerCase()
}

export function isTrialExpired(trialEndsAt: string | null | undefined): boolean {
  if (!trialEndsAt) return false
  return new Date(trialEndsAt).getTime() < Date.now()
}

export function trialDaysLabel() {
  return `${TRIAL_DAYS} days`
}

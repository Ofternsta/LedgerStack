import 'server-only'

import type { User } from '@supabase/supabase-js'
import { getAuthUserSummaryByEmail } from '@/lib/auth-user-lookup'
import { normalizeSignupEmail } from '@/lib/trial-eligibility'

export function isEmailVerifiedUser(user: Pick<User, 'email_confirmed_at'>): boolean {
  return Boolean(user.email_confirmed_at)
}

export async function isEmailVerifiedAddress(email: string): Promise<boolean> {
  const summary = await getAuthUserSummaryByEmail(normalizeSignupEmail(email))
  return Boolean(summary?.emailConfirmed)
}

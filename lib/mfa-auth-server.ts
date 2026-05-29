import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

/** Server-side: block app access until MFA challenge completes. */
export async function needsMfaVerificationServer(
  supabase: SupabaseClient
): Promise<boolean> {
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  if (error || !data) return false
  return data.nextLevel === 'aal2' && data.currentLevel !== 'aal2'
}

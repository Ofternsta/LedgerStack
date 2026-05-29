import type { SupabaseClient } from '@supabase/supabase-js'

/** User signed in with password but has not completed MFA this session. */
export async function needsMfaVerification(
  supabase: SupabaseClient
): Promise<boolean> {
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  if (error || !data) return false
  return data.nextLevel === 'aal2' && data.currentLevel !== 'aal2'
}

export async function getVerifiedTotpFactorId(
  supabase: SupabaseClient
): Promise<string | null> {
  const { data, error } = await supabase.auth.mfa.listFactors()
  if (error) return null
  const verified = (data.totp || []).find((f) => f.status === 'verified')
  return verified?.id ?? null
}

export async function verifyMfaLoginCode(
  supabase: SupabaseClient,
  factorId: string,
  code: string
): Promise<{ error: string | null }> {
  const { data: challenge, error: challengeError } =
    await supabase.auth.mfa.challenge({ factorId })

  if (challengeError || !challenge) {
    return { error: challengeError?.message || 'Could not start MFA challenge.' }
  }

  const { error: verifyError } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code: code.trim(),
  })

  return { error: verifyError?.message ?? null }
}

import type { SupabaseClient } from '@supabase/supabase-js'
import { assertCanAddWorker } from '@/lib/plan-enforcement'
import type { AppRole } from '@/lib/roles'
import { lookupOrganizationByInvite } from '@/lib/validate-invite'

export type SignupMetadata = {
  role?: string
  full_name?: string
  organization_name?: string
  invite_code?: string
  billing_plan?: string
}

function parseRole(raw: string | undefined): AppRole | null {
  if (raw === 'admin' || raw === 'worker' || raw === 'client') return raw
  return null
}

export async function ensureUserProfile(
  supabase: SupabaseClient,
  userId: string,
  metadata: SignupMetadata,
  overrides?: {
    role?: AppRole
    fullName?: string
    organizationName?: string
    inviteCode?: string
  }
): Promise<{ error: string | null; created: boolean; organizationId?: string }> {
  const { data: existing } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', userId)
    .maybeSingle()

  if (existing) {
    return { error: null, created: false, organizationId: undefined }
  }

  const requestedRole =
    overrides?.role ?? parseRole(metadata.role) ?? ('client' as AppRole)

  // Admin companies are created only after Stripe (register-admin / webhook).
  // Block self-serve admin via signUp metadata or API body.
  if (requestedRole === 'admin') {
    return {
      error:
        'Company admin accounts must be created through the signup and subscription flow at /login?signup=admin.',
      created: false,
      organizationId: undefined,
    }
  }

  const role = requestedRole

  const { error: profileError } = await supabase.from('profiles').insert({
    id: userId,
    role,
    full_name:
      overrides?.fullName?.trim() ||
      metadata.full_name?.trim() ||
      null,
  })

  if (profileError) {
    return { error: profileError.message, created: false, organizationId: undefined }
  }

  if (role === 'worker') {
    const lookup = await lookupOrganizationByInvite(
      supabase,
      overrides?.inviteCode || metadata.invite_code || ''
    )

    if (!lookup.ok) {
      await supabase.from('profiles').delete().eq('id', userId)
      return { error: lookup.error, created: false, organizationId: undefined }
    }

    const workerCheck = await assertCanAddWorker(
      supabase,
      lookup.organizationId
    )
    if (!workerCheck.ok) {
      await supabase.from('profiles').delete().eq('id', userId)
      return { error: workerCheck.error, created: false, organizationId: undefined }
    }

    const { error: memberError } = await supabase
      .from('organization_members')
      .insert({
        organization_id: lookup.organizationId,
        user_id: userId,
        status: 'pending',
      })

    if (memberError) {
      await supabase.from('profiles').delete().eq('id', userId)
      return { error: memberError.message, created: false, organizationId: undefined }
    }
  }

  return { error: null, created: true, organizationId: undefined }
}

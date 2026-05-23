import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  generateInviteCode,
  isProceduralInviteFormat,
} from '@/lib/invite-code'

/**
 * Creates admin profile + organization after Stripe checkout.
 * Only call from register-admin / webhook — not from public signup APIs.
 */
export async function setupAdminOrganizationAfterStripe(
  supabase: SupabaseClient,
  userId: string,
  input: {
    fullName?: string | null
    organizationName: string
  }
): Promise<{ error: string | null; organizationId: string | null; created: boolean }> {
  const orgName = input.organizationName?.trim() || 'My Company'

  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', userId)
    .maybeSingle()

  const { data: existingOrg } = await supabase
    .from('organizations')
    .select('id')
    .eq('admin_user_id', userId)
    .maybeSingle()

  if (existingOrg?.id) {
    return {
      error: null,
      organizationId: existingOrg.id as string,
      created: false,
    }
  }

  if (!existingProfile) {
    const { error: profileError } = await supabase.from('profiles').insert({
      id: userId,
      role: 'admin',
      full_name: input.fullName?.trim() || null,
    })

    if (profileError) {
      return { error: profileError.message, organizationId: null, created: false }
    }
  } else if (existingProfile.role !== 'admin') {
    return {
      error: 'This email is already registered with a non-admin role.',
      organizationId: null,
      created: false,
    }
  }

  let inviteCode = generateInviteCode()
  for (let i = 0; i < 5 && !isProceduralInviteFormat(inviteCode); i++) {
    inviteCode = generateInviteCode()
  }

  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .insert({
      admin_user_id: userId,
      name: orgName,
      invite_code: inviteCode,
    })
    .select('id')
    .single()

  if (orgError || !org) {
    return {
      error: orgError?.message || 'Could not create organization',
      organizationId: null,
      created: false,
    }
  }

  return {
    error: null,
    organizationId: org.id as string,
    created: true,
  }
}

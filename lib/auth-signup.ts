import { generateInviteCode, isProceduralInviteFormat } from '@/lib/invite-code'
import type { AppRole } from '@/lib/roles'
import { supabase } from '@/lib/supabase'
import { lookupOrganizationByInvite } from '@/lib/validate-invite'

export async function completeSignupProfile(input: {
  userId: string
  role: AppRole
  fullName?: string
  organizationName?: string
  inviteCode?: string
}): Promise<string | null> {
  const { error: profileError } = await supabase.from('profiles').insert({
    id: input.userId,
    role: input.role,
    full_name: input.fullName?.trim() || null,
  })

  if (profileError) {
    return profileError.message
  }

  if (input.role === 'admin') {
    let code = generateInviteCode()
    for (let i = 0; i < 5 && !isProceduralInviteFormat(code); i++) {
      code = generateInviteCode()
    }

    const { error: orgError } = await supabase.from('organizations').insert({
      admin_user_id: input.userId,
      name: input.organizationName?.trim() || 'My Company',
      invite_code: code,
    })

    if (orgError) return orgError.message
    return null
  }

  if (input.role === 'worker') {
    const lookup = await lookupOrganizationByInvite(
      supabase,
      input.inviteCode || ''
    )

    if (!lookup.ok) {
      return lookup.error
    }

    const { error: memberError } = await supabase
      .from('organization_members')
      .insert({
        organization_id: lookup.organizationId,
        user_id: input.userId,
        status: 'pending',
      })

    if (memberError) return memberError.message
    return null
  }

  return null
}

export async function linkClientAccessByEmail() {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) return

  await fetch('/api/auth/link-client-access', { method: 'POST' })
}

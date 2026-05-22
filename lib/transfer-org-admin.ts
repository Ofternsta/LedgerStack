import type { SupabaseClient } from '@supabase/supabase-js'

/** Current org admin transfers ownership to an approved worker */
export async function transferOrgAdmin(
  supabase: SupabaseClient,
  currentAdminId: string,
  memberId: string
): Promise<{ error: string | null }> {
  const { data: org } = await supabase
    .from('organizations')
    .select('id')
    .eq('admin_user_id', currentAdminId)
    .maybeSingle()

  if (!org) {
    return { error: 'You are not an organization admin' }
  }

  const { data: member } = await supabase
    .from('organization_members')
    .select('id, user_id, organization_id, status')
    .eq('id', memberId)
    .eq('organization_id', org.id)
    .maybeSingle()

  if (!member || member.status !== 'approved') {
    return { error: 'Only approved workers can be promoted to admin' }
  }

  if (member.user_id === currentAdminId) {
    return { error: 'You are already the admin' }
  }

  const { error: orgError } = await supabase
    .from('organizations')
    .update({ admin_user_id: member.user_id })
    .eq('id', org.id)

  if (orgError) return { error: orgError.message }

  await supabase
    .from('profiles')
    .update({ role: 'admin' })
    .eq('id', member.user_id)

  await supabase
    .from('profiles')
    .update({ role: 'worker' })
    .eq('id', currentAdminId)

  await supabase.from('organization_members').delete().eq('id', memberId)

  const { data: existingMembership } = await supabase
    .from('organization_members')
    .select('id')
    .eq('organization_id', org.id)
    .eq('user_id', currentAdminId)
    .maybeSingle()

  if (!existingMembership) {
    await supabase.from('organization_members').insert({
      organization_id: org.id,
      user_id: currentAdminId,
      status: 'approved',
      approved_at: new Date().toISOString(),
      approved_by: member.user_id,
    })
  } else {
    await supabase
      .from('organization_members')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: member.user_id,
      })
      .eq('id', existingMembership.id)
  }

  return { error: null }
}

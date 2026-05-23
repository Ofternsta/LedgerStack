import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

export type TeamRosterMember = {
  id: string
  full_name: string | null
  role: string
  label: string
}

export async function loadTeamRoster(
  supabase: SupabaseClient,
  organizationId: string
): Promise<TeamRosterMember[]> {
  const { data: org } = await supabase
    .from('organizations')
    .select('admin_user_id')
    .eq('id', organizationId)
    .maybeSingle()

  const members: TeamRosterMember[] = []

  if (org?.admin_user_id) {
    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .eq('id', org.admin_user_id)
      .maybeSingle()

    if (adminProfile) {
      members.push({
        id: adminProfile.id,
        full_name: adminProfile.full_name,
        role: adminProfile.role,
        label: adminProfile.full_name?.trim() || 'Admin',
      })
    }
  }

  const { data: workers } = await supabase
    .from('organization_members')
    .select('user_id')
    .eq('organization_id', organizationId)
    .eq('status', 'approved')

  const workerIds = (workers || []).map((w) => w.user_id)
  if (workerIds.length) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .in('id', workerIds)

    for (const p of profiles || []) {
      if (p.id === org?.admin_user_id) continue
      members.push({
        id: p.id,
        full_name: p.full_name,
        role: p.role,
        label: p.full_name?.trim() || 'Worker',
      })
    }
  }

  return members
}

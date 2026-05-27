import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  formatSenderDisplay,
  loadSenderContext,
} from '@/lib/message-sender-labels'

export type TeamRosterMember = {
  id: string
  full_name: string | null
  role: string
  label: string
  /** Name with role/title suffix for messaging UI */
  display_label: string
  role_label: string
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

  const { data: workers } = await supabase
    .from('organization_members')
    .select('user_id, job_title')
    .eq('organization_id', organizationId)
    .eq('status', 'approved')

  const workerIds = (workers || []).map((w) => w.user_id)
  const allIds = [...new Set([org?.admin_user_id, ...workerIds].filter(Boolean))] as string[]

  const { orgAdminUserId, profiles, jobTitleByUserId } = await loadSenderContext(
    organizationId,
    allIds
  )

  for (const m of workers || []) {
    jobTitleByUserId[m.user_id] = m.job_title ?? jobTitleByUserId[m.user_id]
  }

  if (orgAdminUserId) {
    const profile = profiles[orgAdminUserId]
    const { sender_name, sender_role, sender_label } = formatSenderDisplay(
      orgAdminUserId,
      profile,
      orgAdminUserId,
      jobTitleByUserId
    )
    members.push({
      id: orgAdminUserId,
      full_name: profile?.full_name ?? null,
      role: sender_role,
      label: sender_name,
      display_label: sender_label,
      role_label: 'Admin',
    })
  }

  for (const userId of workerIds) {
    if (userId === orgAdminUserId) continue
    const profile = profiles[userId]
    const { sender_name, sender_role, sender_label } = formatSenderDisplay(
      userId,
      profile,
      orgAdminUserId,
      jobTitleByUserId
    )
    const roleLabel =
      jobTitleByUserId[userId]?.trim() || 'Worker'

    members.push({
      id: userId,
      full_name: profile?.full_name ?? null,
      role: sender_role,
      label: sender_name,
      display_label: sender_label,
      role_label: roleLabel,
    })
  }

  return members
}

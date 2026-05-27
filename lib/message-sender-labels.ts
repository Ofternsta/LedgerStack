import 'server-only'

import { createServiceClient } from '@/lib/supabase/service'

export type EnrichedMessageRow = {
  id: string
  sender_id: string
  body: string
  created_at: string
  sender_name: string
  sender_role: string
  sender_label: string
}

type SenderProfile = {
  full_name: string | null
  role: string
}

/** Role suffix in chat: Admin, Client, job title, or Worker. */
export function resolveSenderRoleLabel(
  senderId: string,
  profile: SenderProfile | undefined,
  orgAdminUserId: string | null,
  jobTitleByUserId: Record<string, string | null>
): string {
  if (orgAdminUserId && senderId === orgAdminUserId) {
    return 'Admin'
  }

  const role = profile?.role
  if (role === 'client') return 'Client'
  if (role === 'admin') return 'Admin'

  const customTitle = jobTitleByUserId[senderId]?.trim()
  if (customTitle) return customTitle

  return 'Worker'
}

export function formatSenderDisplay(
  senderId: string,
  profile: SenderProfile | undefined,
  orgAdminUserId: string | null,
  jobTitleByUserId: Record<string, string | null>
): { sender_name: string; sender_role: string; sender_label: string } {
  const roleLabel = resolveSenderRoleLabel(
    senderId,
    profile,
    orgAdminUserId,
    jobTitleByUserId
  )

  const isOrgAdmin = orgAdminUserId && senderId === orgAdminUserId
  const profileRole = isOrgAdmin
    ? 'admin'
    : profile?.role || (roleLabel === 'Worker' ? 'worker' : 'unknown')

  const displayName =
    profile?.full_name?.trim() ||
    (isOrgAdmin ? 'Admin' : roleLabel === 'Worker' ? 'Worker' : roleLabel)

  return {
    sender_name: displayName,
    sender_role: profileRole,
    sender_label: `${displayName} (${roleLabel})`,
  }
}

export async function loadSenderContext(
  organizationId: string,
  senderIds: string[]
): Promise<{
  orgAdminUserId: string | null
  profiles: Record<string, SenderProfile>
  jobTitleByUserId: Record<string, string | null>
}> {
  const service = createServiceClient()

  const { data: org } = await service
    .from('organizations')
    .select('admin_user_id')
    .eq('id', organizationId)
    .maybeSingle()

  const orgAdminUserId = org?.admin_user_id ?? null

  let profiles: Record<string, SenderProfile> = {}
  if (senderIds.length) {
    const { data: rows } = await service
      .from('profiles')
      .select('id, full_name, role')
      .in('id', senderIds)

    profiles = Object.fromEntries(
      (rows || []).map((p) => [
        p.id,
        { full_name: p.full_name, role: p.role },
      ])
    )
  }

  const { data: members } = await service
    .from('organization_members')
    .select('user_id, job_title')
    .eq('organization_id', organizationId)
    .eq('status', 'approved')

  const jobTitleByUserId: Record<string, string | null> = {}
  for (const m of members || []) {
    jobTitleByUserId[m.user_id] = m.job_title
  }

  return { orgAdminUserId, profiles, jobTitleByUserId }
}

export async function enrichMessageSenders(
  organizationId: string,
  rows: Array<{
    id: string
    sender_id: string
    body: string
    created_at: string
  }>
): Promise<EnrichedMessageRow[]> {
  if (!rows.length) return []

  const senderIds = [...new Set(rows.map((r) => r.sender_id))]
  const { orgAdminUserId, profiles, jobTitleByUserId } = await loadSenderContext(
    organizationId,
    senderIds
  )

  return rows.map((r) => {
    const profile = profiles[r.sender_id]
    const { sender_name, sender_role, sender_label } = formatSenderDisplay(
      r.sender_id,
      profile,
      orgAdminUserId,
      jobTitleByUserId
    )

    return {
      id: r.id,
      sender_id: r.sender_id,
      body: r.body,
      created_at: r.created_at,
      sender_name,
      sender_role,
      sender_label,
    }
  })
}

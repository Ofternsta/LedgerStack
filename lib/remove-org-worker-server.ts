import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

/** Admin removes an approved worker from the organization. */
export async function removeOrgWorkerServer(
  service: SupabaseClient,
  adminUserId: string,
  memberId: string
): Promise<{ error: string | null }> {
  const { data: member, error: memberError } = await service
    .from('organization_members')
    .select('id, organization_id, user_id, status')
    .eq('id', memberId)
    .maybeSingle()

  if (memberError) {
    return { error: memberError.message }
  }

  if (!member) {
    return { error: 'Worker not found.' }
  }

  if (member.status !== 'approved') {
    return { error: 'Only approved workers can be removed this way.' }
  }

  const { data: org, error: orgError } = await service
    .from('organizations')
    .select('id, admin_user_id')
    .eq('id', member.organization_id)
    .maybeSingle()

  if (orgError) {
    return { error: orgError.message }
  }

  if (!org || org.admin_user_id !== adminUserId) {
    return { error: 'Forbidden' }
  }

  if (member.user_id === adminUserId) {
    return { error: 'You cannot remove yourself as organization admin.' }
  }

  const { data: projects, error: projectsError } = await service
    .from('projects')
    .select('id')
    .eq('organization_id', member.organization_id)

  if (projectsError) {
    return { error: projectsError.message }
  }

  const projectIds = (projects || []).map((p) => p.id)
  if (projectIds.length) {
    const { error: assignmentError } = await service
      .from('project_worker_assignments')
      .delete()
      .eq('user_id', member.user_id)
      .in('project_id', projectIds)

    if (assignmentError) {
      return { error: assignmentError.message }
    }
  }

  const { error: deleteError } = await service
    .from('organization_members')
    .delete()
    .eq('id', memberId)

  if (deleteError) {
    return { error: deleteError.message }
  }

  return { error: null }
}

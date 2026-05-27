import type { SupabaseClient } from '@supabase/supabase-js'
import { isOrganizationAdmin } from '@/lib/org-admin'
import {
  type WorkerPermissionKey,
  parseWorkerPermissions,
} from '@/lib/worker-permissions'
import { getProjectOrgId } from '@/lib/staff-project-access'

export async function getApprovedMemberPermissions(
  supabase: SupabaseClient,
  userId: string,
  organizationId: string
) {
  const { data: member } = await supabase
    .from('organization_members')
    .select('can_upload, can_delete, can_add_events, can_view_files, status')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .eq('status', 'approved')
    .maybeSingle()

  return parseWorkerPermissions(member ?? undefined)
}

export async function assertProjectMemberPermission(
  supabase: SupabaseClient,
  userId: string,
  projectId: string,
  permission: WorkerPermissionKey
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const organizationId = await getProjectOrgId(supabase, projectId)
  if (!organizationId) {
    return { ok: false, error: 'Project not found', status: 404 }
  }

  if (await isOrganizationAdmin(supabase, organizationId, userId)) {
    return { ok: true }
  }

  const { data: member } = await supabase
    .from('organization_members')
    .select(
      'status, can_upload, can_delete, can_add_events, can_view_files'
    )
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .maybeSingle()

  if (member?.status !== 'approved') {
    return { ok: false, error: 'Forbidden', status: 403 }
  }

  const flags = parseWorkerPermissions(member)
  if (!flags[permission]) {
    const messages: Record<WorkerPermissionKey, string> = {
      can_upload: 'You do not have permission to upload files.',
      can_delete: 'You do not have permission to delete files.',
      can_add_events: 'You do not have permission to add calendar events.',
      can_view_files: 'You do not have permission to view project files.',
    }
    return { ok: false, error: messages[permission], status: 403 }
  }

  return { ok: true }
}

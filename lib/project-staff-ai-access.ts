import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import { isOrganizationAdmin } from '@/lib/org-admin'
import { getProjectWorkerPermissions } from '@/lib/project-worker-assignments'
import { getProjectOrgId } from '@/lib/staff-project-access'

export async function canStaffGenerateProjectAi(
  supabase: SupabaseClient,
  userId: string,
  projectId: string
): Promise<boolean> {
  const organizationId = await getProjectOrgId(supabase, projectId)
  if (!organizationId) return false

  if (await isOrganizationAdmin(supabase, organizationId, userId)) {
    return true
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle()

  if (profile?.role !== 'worker') return false

  const { data: membership } = await supabase
    .from('organization_members')
    .select('status')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .eq('status', 'approved')
    .maybeSingle()

  if (!membership) return false

  const perms = await getProjectWorkerPermissions(supabase, projectId, userId)
  if (!perms) return false

  return perms.can_upload || perms.can_add_events || perms.can_view_files
}

/** AI summary & PDF/HTML export — organization admins only. */
export async function assertAdminProjectAiSummaryExportAccess(
  supabase: SupabaseClient,
  userId: string,
  projectId: string
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const organizationId = await getProjectOrgId(supabase, projectId)
  if (!organizationId) {
    return { ok: false, error: 'Project not found', status: 404 }
  }

  if (!(await isOrganizationAdmin(supabase, organizationId, userId))) {
    return {
      ok: false,
      error: 'Only organization admins can use AI summary and export.',
      status: 403,
    }
  }

  return { ok: true }
}

export async function assertStaffProjectAiAccess(
  supabase: SupabaseClient,
  userId: string,
  projectId: string
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const allowed = await canStaffGenerateProjectAi(supabase, userId, projectId)
  if (!allowed) {
    return {
      ok: false,
      error: 'You do not have permission to use AI features on this project.',
      status: 403,
    }
  }
  return { ok: true }
}

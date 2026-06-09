import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import { isOrganizationAdmin } from '@/lib/org-admin'
import { getProjectOrgId } from '@/lib/staff-project-access'

/** Job timeline is visible to organization admins only (not workers or clients). */
export async function assertAdminProjectTimelineAccess(
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
      error: 'Only organization admins can view the job timeline.',
      status: 403,
    }
  }

  return { ok: true }
}

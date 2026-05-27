import type { SupabaseClient } from '@supabase/supabase-js'
import { getProjectOrgId } from '@/lib/staff-project-access'

/** Organization admin only; project must still exist (not deleted). */
export async function canAdminArchiveProject(
  supabase: SupabaseClient,
  projectId: string,
  userId: string
): Promise<boolean> {
  const { data: project } = await supabase
    .from('projects')
    .select('id, organization_id')
    .eq('id', projectId)
    .maybeSingle()

  if (!project?.organization_id) return false

  const { data: org } = await supabase
    .from('organizations')
    .select('id')
    .eq('id', project.organization_id)
    .eq('admin_user_id', userId)
    .maybeSingle()

  return Boolean(org)
}

export async function requireExistingProject(
  supabase: SupabaseClient,
  projectId: string
): Promise<{ organizationId: string } | null> {
  const organizationId = await getProjectOrgId(supabase, projectId)
  if (!organizationId) return null
  return { organizationId }
}

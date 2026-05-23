import type { SupabaseClient } from '@supabase/supabase-js'

/** True if this user is the billing admin for the organization. */
export async function isOrganizationAdmin(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string
): Promise<boolean> {
  const { data: org } = await supabase
    .from('organizations')
    .select('id')
    .eq('id', organizationId)
    .eq('admin_user_id', userId)
    .maybeSingle()

  return Boolean(org)
}

/** Project id is first segment of storage path: `{projectId}/{claimId}/file` */
export function projectIdFromEvidencePath(filePath: string): string | null {
  const segment = filePath.split('/')[0]?.trim()
  return segment || null
}

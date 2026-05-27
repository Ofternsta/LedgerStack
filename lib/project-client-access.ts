import type { SupabaseClient } from '@supabase/supabase-js'

/** Approved client on a project (by linked user id or signup email). */
export async function hasApprovedClientProjectAccess(
  supabase: SupabaseClient,
  projectId: string,
  userId: string,
  email?: string | null
): Promise<boolean> {
  const normalizedEmail = email?.trim().toLowerCase()

  let query = supabase
    .from('project_client_access')
    .select('id')
    .eq('project_id', projectId)
    .eq('status', 'approved')

  if (normalizedEmail) {
    query = query.or(
      `user_id.eq.${userId},client_email.eq.${normalizedEmail}`
    )
  } else {
    query = query.eq('user_id', userId)
  }

  const { data } = await query.limit(1).maybeSingle()
  return Boolean(data)
}

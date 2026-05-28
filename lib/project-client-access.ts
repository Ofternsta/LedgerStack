import type { SupabaseClient } from '@supabase/supabase-js'
import { createServiceClient } from '@/lib/supabase/service'

/** Same rule as RLS / storage: approved client invite for this user. */
export async function clientCanAccessProject(
  supabase: SupabaseClient,
  projectId: string,
  userId: string,
  email?: string | null
): Promise<boolean> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle()

  if (profile?.role !== 'client') {
    return false
  }

  const { data: viaRpc, error: rpcError } = await supabase.rpc(
    'can_access_project',
    { pid: projectId }
  )
  if (!rpcError && viaRpc === true) {
    return true
  }

  const normalizedEmail = email?.trim().toLowerCase()

  try {
    const service = createServiceClient()
    let query = service
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
  } catch {
    return false
  }
}

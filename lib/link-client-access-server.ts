import 'server-only'

import { getAuthUserIdByEmail } from '@/lib/auth-user-lookup'
import { createServiceClient } from '@/lib/supabase/service'

/** Attach signed-in user id to approved client invites (service role). */
export async function linkClientAccessByEmailServer(
  email: string,
  userId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const normalized = email.trim().toLowerCase()
  if (!normalized) {
    return { ok: false, error: 'Email required' }
  }

  const service = createServiceClient()
  const { error } = await service
    .from('project_client_access')
    .update({ user_id: userId })
    .eq('client_email', normalized)
    .eq('status', 'approved')

  if (error) {
    return { ok: false, error: error.message }
  }

  return { ok: true }
}

/** Grant or re-approve client access (restores rows revoked as rejected). */
export async function grantClientProjectAccessServer(input: {
  projectId: string
  clientEmail: string
  approvedBy: string
}): Promise<
  | { ok: true; accessId: string }
  | { ok: false; error: string }
> {
  const clientEmail = input.clientEmail.trim().toLowerCase()
  const service = createServiceClient()

  let userId: string | null = null
  try {
    userId = await getAuthUserIdByEmail(clientEmail)
  } catch {
    userId = null
  }

  const { data: row, error } = await service
    .from('project_client_access')
    .upsert(
      {
        project_id: input.projectId,
        client_email: clientEmail,
        status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: input.approvedBy,
        user_id: userId,
      },
      { onConflict: 'project_id,client_email' }
    )
    .select('id')
    .single()

  if (error || !row) {
    return { ok: false, error: error?.message || 'Could not grant access' }
  }

  return { ok: true, accessId: row.id as string }
}

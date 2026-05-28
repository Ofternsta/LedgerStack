import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import { listAllProjectEvidence, type EvidenceRecord } from '@/lib/evidence-storage'
import { createServiceClient } from '@/lib/supabase/service'

export async function getApprovedClientAccessRow(
  supabase: SupabaseClient,
  projectId: string,
  userId: string,
  email?: string | null
): Promise<{ id: string } | null> {
  const normalizedEmail = email?.trim().toLowerCase()

  let query = supabase
    .from('project_client_access')
    .select('id')
    .eq('project_id', projectId)
    .eq('status', 'approved')

  if (normalizedEmail) {
    query = query.or(`user_id.eq.${userId},client_email.eq.${normalizedEmail}`)
  } else {
    query = query.eq('user_id', userId)
  }

  const { data } = await query.limit(1).maybeSingle()
  return data ? { id: data.id as string } : null
}

export async function getSharedFilePaths(
  accessId: string
): Promise<Set<string>> {
  const service = createServiceClient()
  const { data, error } = await service
    .from('project_client_shared_files')
    .select('file_path')
    .eq('project_client_access_id', accessId)

  if (error) {
    throw new Error(error.message)
  }

  return new Set((data || []).map((r) => r.file_path as string))
}

export async function setSharedFilePaths(
  accessId: string,
  projectId: string,
  filePaths: string[]
): Promise<void> {
  const service = createServiceClient()
  const allowed = new Set(
    (await listAllProjectEvidence(service, projectId)).map((f) => f.file_path)
  )
  const unique = [...new Set(filePaths.filter((p) => p && allowed.has(p)))]

  const { error: deleteError } = await service
    .from('project_client_shared_files')
    .delete()
    .eq('project_client_access_id', accessId)

  if (deleteError) {
    throw new Error(deleteError.message)
  }

  if (!unique.length) return

  const { error: insertError } = await service
    .from('project_client_shared_files')
    .insert(
      unique.map((file_path) => ({
        project_client_access_id: accessId,
        file_path,
      }))
    )

  if (insertError) {
    throw new Error(insertError.message)
  }
}

export function filterEvidenceForClient(
  records: EvidenceRecord[],
  sharedPaths: Set<string>
): EvidenceRecord[] {
  if (!sharedPaths.size) return []
  return records.filter((r) => sharedPaths.has(r.file_path))
}

export async function loadClientSharingPayload(
  projectId: string,
  accessId: string
) {
  const service = createServiceClient()
  const files = await listAllProjectEvidence(service, projectId)
  const sharedPaths = await getSharedFilePaths(accessId)

  return {
    files,
    shared_paths: [...sharedPaths],
  }
}

export async function assertAdminOwnsClientAccess(
  supabase: SupabaseClient,
  userId: string,
  projectId: string,
  accessId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: project } = await supabase
    .from('projects')
    .select('id, organization_id')
    .eq('id', projectId)
    .maybeSingle()

  if (!project) {
    return { ok: false, error: 'Project not found' }
  }

  const { data: org } = await supabase
    .from('organizations')
    .select('id')
    .eq('id', project.organization_id)
    .eq('admin_user_id', userId)
    .maybeSingle()

  if (!org) {
    return { ok: false, error: 'Forbidden' }
  }

  const { data: access } = await supabase
    .from('project_client_access')
    .select('id')
    .eq('id', accessId)
    .eq('project_id', projectId)
    .neq('status', 'rejected')
    .maybeSingle()

  if (!access) {
    return { ok: false, error: 'Client access not found' }
  }

  return { ok: true }
}

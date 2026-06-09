import 'server-only'

import { createServiceClient } from '@/lib/supabase/service'
import {
  mapProjectListRow,
  PROJECT_LIST_COLUMNS,
} from '@/lib/project-job-count'

const PROJECT_COLUMNS = PROJECT_LIST_COLUMNS

/** Projects shared with a client (approved invite by user id or email). */
export async function listClientProjectsServer(
  userId: string,
  email: string
) {
  const normalized = email.trim().toLowerCase()
  const service = createServiceClient()

  const { data: accessRows, error: accessError } = await service
    .from('project_client_access')
    .select('project_id')
    .eq('status', 'approved')
    .or(`user_id.eq.${userId},client_email.eq.${normalized}`)

  if (accessError) {
    throw new Error(accessError.message)
  }

  const projectIds = [
    ...new Set((accessRows || []).map((r) => r.project_id as string)),
  ]

  if (!projectIds.length) {
    return []
  }

  const { data: projects, error: projectError } = await service
    .from('projects')
    .select(PROJECT_COLUMNS)
    .in('id', projectIds)
    .order('created_at', { ascending: false })

  if (projectError) {
    throw new Error(projectError.message)
  }

  return (projects || []).map((row) => mapProjectListRow(row))
}

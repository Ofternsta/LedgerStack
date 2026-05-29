import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import { parseDefaultWorkerPermissions } from '@/lib/org-status-labels'
import type { WorkerPermissions } from '@/lib/worker-permissions'

export type OrgSettings = {
  defaultWorkerPermissions: WorkerPermissions
}

export async function loadOrgSettings(
  supabase: SupabaseClient,
  organizationId: string
): Promise<OrgSettings | null> {
  const { data, error } = await supabase
    .from('organizations')
    .select('default_worker_permissions')
    .eq('id', organizationId)
    .maybeSingle()

  if (error || !data) return null

  return {
    defaultWorkerPermissions: parseDefaultWorkerPermissions(
      data.default_worker_permissions
    ),
  }
}

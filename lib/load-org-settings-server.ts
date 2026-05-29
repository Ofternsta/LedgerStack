import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  parseClaimStatusLabels,
  parseDefaultWorkerPermissions,
  type ClaimStatusLabels,
} from '@/lib/org-status-labels'
import type { WorkerPermissions } from '@/lib/worker-permissions'

export type OrgSettings = {
  claimStatusLabels: ClaimStatusLabels
  defaultWorkerPermissions: WorkerPermissions
}

export async function loadOrgSettings(
  supabase: SupabaseClient,
  organizationId: string
): Promise<OrgSettings | null> {
  const { data, error } = await supabase
    .from('organizations')
    .select('claim_status_labels, default_worker_permissions')
    .eq('id', organizationId)
    .maybeSingle()

  if (error || !data) return null

  return {
    claimStatusLabels: parseClaimStatusLabels(data.claim_status_labels),
    defaultWorkerPermissions: parseDefaultWorkerPermissions(
      data.default_worker_permissions
    ),
  }
}

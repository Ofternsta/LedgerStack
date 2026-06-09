import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import { isOrganizationAdmin } from '@/lib/org-admin'
import { getOrgPlanContext } from '@/lib/org-plan'
import { countApprovedWorkers, countOrgProjects } from '@/lib/plan-usage'
import type { WorkerPermissionKey } from '@/lib/worker-permissions'

export const DOWNGRADE_READ_ONLY_MESSAGE =
  'Your organization exceeds its active project limit. Admin access is read-only until projects are within the plan limit or you upgrade.'

export const WORKER_STAFF_LIMIT_MESSAGE =
  'This organization is over the worker limit on its current plan. Workers cannot access projects until limits are satisfied or the organization upgrades.'

/** Admin-only view permissions allowed when org is over the project limit. */
export const ADMIN_READ_ONLY_PERMISSIONS = new Set<WorkerPermissionKey>([
  'can_view_files',
  'can_download_files',
])

export async function isOrgAdminDowngradeReadOnly(
  supabase: SupabaseClient,
  organizationId: string
): Promise<boolean> {
  const planCtx = await getOrgPlanContext(supabase, organizationId)
  if (!planCtx) return false
  const { maxActiveProjects } = planCtx.entitlements
  if (maxActiveProjects < 0) return false
  const count = await countOrgProjects(supabase, organizationId)
  return count > maxActiveProjects
}

export async function isWorkerOverStaffLimit(
  supabase: SupabaseClient,
  organizationId: string
): Promise<boolean> {
  const planCtx = await getOrgPlanContext(supabase, organizationId)
  if (!planCtx) return true
  const { maxStaffUsers } = planCtx.entitlements
  if (maxStaffUsers < 0) return false
  const workers = await countApprovedWorkers(supabase, organizationId)
  return 1 + workers > maxStaffUsers
}

export async function assertOrgAdminCanMutate(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  if (!(await isOrganizationAdmin(supabase, organizationId, userId))) {
    return { ok: false, error: 'Organization admin only', status: 403 }
  }
  if (await isOrgAdminDowngradeReadOnly(supabase, organizationId)) {
    return {
      ok: false,
      error: DOWNGRADE_READ_ONLY_MESSAGE,
      status: 403,
    }
  }
  return { ok: true }
}

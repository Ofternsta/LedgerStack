import type { SupabaseClient } from '@supabase/supabase-js'

export function currentUsageMonthKey() {
  const now = new Date()
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
}

export async function countOrgProjects(
  supabase: SupabaseClient,
  organizationId: string
): Promise<number> {
  const { count, error } = await supabase
    .from('projects')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)

  if (error) return 0
  return count ?? 0
}

export async function getAiUsageThisMonth(
  supabase: SupabaseClient,
  organizationId: string
): Promise<number> {
  const monthKey = currentUsageMonthKey()

  const { data } = await supabase
    .from('organization_ai_usage')
    .select('summaries_used')
    .eq('organization_id', organizationId)
    .eq('month_key', monthKey)
    .maybeSingle()

  return data?.summaries_used ?? 0
}

export async function countApprovedWorkers(
  supabase: SupabaseClient,
  organizationId: string
): Promise<number> {
  const { count, error } = await supabase
    .from('organization_members')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .eq('status', 'approved')

  if (error) return 0
  return count ?? 0
}

export async function countCompletedBackups(
  supabase: SupabaseClient,
  organizationId: string
): Promise<number> {
  const { count, error } = await supabase
    .from('organization_backups')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .eq('status', 'completed')

  if (error) return 0
  return count ?? 0
}

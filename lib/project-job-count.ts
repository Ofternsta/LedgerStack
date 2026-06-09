/** Normalize Supabase `claims(count)` embed into a single job count. */
export function jobCountFromClaimsEmbed(
  claims: { count: number }[] | null | undefined
): number {
  const raw = claims?.[0]?.count
  return typeof raw === 'number' && raw >= 0 ? raw : 0
}

export const PROJECT_LIST_COLUMNS =
  'id, customer_name, project_address, notes, created_at, claims(count)' as const

export type ProjectListRow = {
  id: string
  customer_name: string
  project_address: string
  notes?: string | null
  created_at?: string | null
  claims?: { count: number }[] | null
}

export function mapProjectListRow(row: ProjectListRow) {
  return {
    id: row.id,
    customer_name: row.customer_name,
    project_address: row.project_address,
    notes: row.notes ?? undefined,
    created_at: row.created_at ?? undefined,
    job_count: jobCountFromClaimsEmbed(row.claims),
  }
}

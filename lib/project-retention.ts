import 'server-only'

import {
  completedRetentionCutoff,
  inactiveRetentionCutoff,
} from '@/lib/data-retention'
import { deleteProjectServer } from '@/lib/delete-project-server'
import { normalizeClaimStatus } from '@/lib/claim-status'
import { createServiceClient } from '@/lib/supabase/service'

type ClaimRow = {
  id: string
  status: string
  completed_at: string | null
}

type ProjectRow = {
  id: string
  organization_id: string | null
  last_activity_at: string | null
  claims: ClaimRow[] | null
}

function allClaimsCompleted(claims: ClaimRow[]): boolean {
  if (!claims.length) return false
  return claims.every((c) => normalizeClaimStatus(c.status) === 'Completed')
}

function latestCompletedAt(claims: ClaimRow[]): Date | null {
  let latest: Date | null = null
  for (const c of claims) {
    if (!c.completed_at) continue
    const d = new Date(c.completed_at)
    if (!latest || d > latest) latest = d
  }
  return latest
}

export type ProjectRetentionResult = {
  completedDeleted: number
  inactiveDeleted: number
  errors: string[]
}

/** Purge completed projects after 7 days; inactive (non-completed) after 12 months. */
export async function runProjectRetention(): Promise<ProjectRetentionResult> {
  const service = createServiceClient()
  const completedCutoff = completedRetentionCutoff()
  const inactiveCutoff = inactiveRetentionCutoff()

  const { data: projects, error } = await service
    .from('projects')
    .select(
      'id, organization_id, last_activity_at, claims(id, status, completed_at)'
    )

  if (error) {
    return {
      completedDeleted: 0,
      inactiveDeleted: 0,
      errors: [error.message],
    }
  }

  const result: ProjectRetentionResult = {
    completedDeleted: 0,
    inactiveDeleted: 0,
    errors: [],
  }

  for (const row of (projects || []) as ProjectRow[]) {
    const claims = row.claims || []
    if (!claims.length) continue

    let shouldDelete = false
    let reason: 'completed' | 'inactive' | null = null

    if (allClaimsCompleted(claims)) {
      const completedAt = latestCompletedAt(claims)
      if (completedAt && completedAt <= completedCutoff) {
        shouldDelete = true
        reason = 'completed'
      }
    } else {
      const lastActivity = row.last_activity_at
        ? new Date(row.last_activity_at)
        : null
      if (lastActivity && lastActivity <= inactiveCutoff) {
        shouldDelete = true
        reason = 'inactive'
      }
    }

    if (!shouldDelete) continue

    const { error: delError } = await deleteProjectServer(service, row.id)
    if (delError) {
      result.errors.push(`${row.id}: ${delError}`)
      continue
    }

    if (reason === 'completed') result.completedDeleted += 1
    else if (reason === 'inactive') result.inactiveDeleted += 1
  }

  return result
}

import {
  CLAIM_STATUSES,
  type ClaimStatus,
} from '@/lib/claim-status'
import {
  DEFAULT_WORKER_PERMISSIONS,
  type WorkerPermissions,
} from '@/lib/worker-permissions'

export type ClaimStatusLabels = Record<ClaimStatus, string>

export function defaultClaimStatusLabels(): ClaimStatusLabels {
  return Object.fromEntries(
    CLAIM_STATUSES.map((s) => [s, s])
  ) as ClaimStatusLabels
}

export function parseClaimStatusLabels(
  raw: unknown
): ClaimStatusLabels {
  const base = defaultClaimStatusLabels()
  if (!raw || typeof raw !== 'object') return base

  const obj = raw as Record<string, unknown>
  for (const status of CLAIM_STATUSES) {
    const label = obj[status]
    if (typeof label === 'string' && label.trim()) {
      base[status] = label.trim().slice(0, 48)
    }
  }

  base.Completed = 'Completed'
  return base
}

export function serializeClaimStatusLabels(
  labels: ClaimStatusLabels
): Record<string, string> {
  const out: Record<string, string> = {}
  for (const status of CLAIM_STATUSES) {
    const label = labels[status]?.trim() || status
    out[status] = status === 'Completed' ? 'Completed' : label.slice(0, 48)
  }
  return out
}

export function displayClaimStatus(
  status: string,
  labels?: ClaimStatusLabels | null
): string {
  const key = status as ClaimStatus
  if (labels && labels[key]) return labels[key]
  return status
}

export function parseDefaultWorkerPermissions(
  raw: unknown
): WorkerPermissions {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_WORKER_PERMISSIONS }
  }
  const o = raw as Record<string, unknown>
  return {
    can_upload: Boolean(o.can_upload ?? DEFAULT_WORKER_PERMISSIONS.can_upload),
    can_delete: Boolean(o.can_delete ?? DEFAULT_WORKER_PERMISSIONS.can_delete),
    can_add_events: Boolean(
      o.can_add_events ?? DEFAULT_WORKER_PERMISSIONS.can_add_events
    ),
    can_view_files: Boolean(
      o.can_view_files ?? DEFAULT_WORKER_PERMISSIONS.can_view_files
    ),
  }
}

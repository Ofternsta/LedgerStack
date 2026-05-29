/**
 * Backwards-compatible helpers; workflows are per-project (see project-status-workflow).
 */
import {
  COMPLETED_STATUS_KEY,
  DEFAULT_STATUS_WORKFLOW,
  isStatusInWorkflow,
  normalizeStatusKey,
  statusIndex,
  type StatusStage,
} from '@/lib/project-status-workflow'

export const CLAIM_STATUSES = DEFAULT_STATUS_WORKFLOW.map((s) => s.label)

export type ClaimStatus = string

export const DEFAULT_CLAIM_STATUS = DEFAULT_STATUS_WORKFLOW[0].key

export function normalizeClaimStatus(
  raw: string | null | undefined,
  workflow: StatusStage[] = DEFAULT_STATUS_WORKFLOW
): string {
  return normalizeStatusKey(raw, workflow)
}

export function claimStatusIndex(
  status: string,
  workflow: StatusStage[] = DEFAULT_STATUS_WORKFLOW
): number {
  return statusIndex(status, workflow)
}

export function isClaimStatus(
  value: string,
  workflow: StatusStage[] = DEFAULT_STATUS_WORKFLOW
): boolean {
  return isStatusInWorkflow(value, workflow)
}

export { COMPLETED_STATUS_KEY }

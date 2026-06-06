import {
  isCompletedStatus,
  parseProjectStatusWorkflow,
  statusLabel,
  type StatusStage,
} from '@/lib/project-status-workflow'

export type ProjectListStatus = {
  statusLabel: string
  isCompleted: boolean
}

type ClaimRow = {
  status: string
  claim_number?: number | null
}

/** Derive list-card status from a project's jobs and workflow. */
export function resolveProjectListStatus(
  claims: ClaimRow[],
  statusWorkflowRaw: unknown
): ProjectListStatus {
  const workflow = parseProjectStatusWorkflow(statusWorkflowRaw)

  if (!claims.length) {
    return { statusLabel: 'No jobs', isCompleted: false }
  }

  const sorted = [...claims].sort(
    (a, b) => (a.claim_number ?? 0) - (b.claim_number ?? 0)
  )

  const allCompleted = sorted.every((c) =>
    isCompletedStatus(c.status, workflow)
  )

  if (allCompleted) {
    return {
      statusLabel: statusLabel('completed', workflow),
      isCompleted: true,
    }
  }

  const lead =
    sorted.find((c) => !isCompletedStatus(c.status, workflow)) ?? sorted[0]

  return {
    statusLabel: statusLabel(lead.status, workflow),
    isCompleted: false,
  }
}

export function enrichProjectForList<
  T extends {
    status_workflow?: unknown
    claims?: ClaimRow[] | null
  },
>(project: T): Omit<T, 'status_workflow' | 'claims'> & ProjectListStatus {
  const claims = project.claims ?? []
  const { statusLabel: listStatusLabel, isCompleted } = resolveProjectListStatus(
    claims,
    project.status_workflow
  )
  const { status_workflow: _sw, claims: _c, ...rest } = project
  return {
    ...rest,
    statusLabel: listStatusLabel,
    isCompleted,
  }
}

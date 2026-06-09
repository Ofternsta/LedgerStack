'use client'

import { ClaimStatusWorkflow } from '@/components/claim-status-workflow'
import { JobTimelinePanel } from '@/components/job-timeline-panel'
import type { StatusStage } from '@/lib/project-status-workflow'

type Props = {
  claimId: string
  projectId: string
  status: string
  workflow: StatusStage[]
  canEditStatus: boolean
  showStatusReadOnlyHint?: boolean
  onStatusChange: (statusKey: string) => void
  onMarkedCompleted?: () => void
  jobLabel?: string
  timelineRefreshKey?: number
  canGenerateTimeline: boolean
  aiSummariesLimit: number
  aiSummariesUsed: number
  showTimeline?: boolean
}

/** Job status and timeline in one card — two columns, visually distinct. */
export function JobStatusTimelinePanel({
  claimId,
  projectId,
  status,
  workflow,
  canEditStatus,
  showStatusReadOnlyHint,
  onStatusChange,
  onMarkedCompleted,
  jobLabel,
  timelineRefreshKey,
  canGenerateTimeline,
  aiSummariesLimit,
  aiSummariesUsed,
  showTimeline = true,
}: Props) {
  return (
    <section className="border border-border rounded-xl bg-surface-elevated overflow-hidden">
      <div
        className={
          showTimeline
            ? 'grid lg:grid-cols-2 lg:items-stretch'
            : 'grid grid-cols-1'
        }
      >
        <div className="p-4 lg:border-r border-border border-b lg:border-b-0 bg-surface">
          <ClaimStatusWorkflow
            embedded
            claimId={claimId}
            projectId={projectId}
            status={status}
            workflow={workflow}
            canEdit={canEditStatus}
            showReadOnlyHint={showStatusReadOnlyHint}
            onStatusChange={onStatusChange}
            onMarkedCompleted={onMarkedCompleted}
          />
        </div>
        {showTimeline && (
          <div className="p-4 bg-surface-elevated">
            <JobTimelinePanel
              embedded
              claimId={claimId}
              projectId={projectId}
              jobLabel={jobLabel}
              timelineRefreshKey={timelineRefreshKey}
              canGenerate={canGenerateTimeline}
              aiSummariesLimit={aiSummariesLimit}
              aiSummariesUsed={aiSummariesUsed}
            />
          </div>
        )}
      </div>
    </section>
  )
}

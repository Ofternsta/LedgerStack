'use client'

import { displayJobCreationNotes } from '@/lib/job-display-notes'
import {
  statusLabel,
  type StatusStage,
} from '@/lib/project-status-workflow'

export type ProjectJobRow = {
  id: string
  client_name: string
  status: string
  notes?: string | null
}

type Props = {
  jobs: ProjectJobRow[]
  projectNotes?: string | null
  workflow: StatusStage[]
  selectedId: string | null
  onSelect: (job: ProjectJobRow) => void
  variant?: 'sidebar' | 'summary'
}

function JobDetails({
  job,
  projectNotes,
  workflow,
  compact,
  selected,
}: {
  job: ProjectJobRow
  projectNotes?: string | null
  workflow: StatusStage[]
  compact?: boolean
  selected?: boolean
}) {
  const creationNotes = displayJobCreationNotes(job.notes, projectNotes)
  const currentStatus = statusLabel(job.status, workflow)
  const labelClass = selected
    ? 'text-[10px] uppercase tracking-wide opacity-70 font-medium'
    : 'text-[10px] uppercase tracking-wide text-muted-dim font-medium'
  const valueClass = selected
    ? compact
      ? 'text-sm font-bold'
      : 'font-bold'
    : compact
      ? 'text-sm font-bold text-foreground'
      : 'font-bold text-foreground'
  const metaClass = selected
    ? compact
      ? 'text-xs opacity-90'
      : 'text-sm opacity-90'
    : compact
      ? 'text-xs text-foreground'
      : 'text-sm text-foreground'
  const notesClass = selected
    ? `${compact ? 'text-xs' : 'text-sm'} opacity-85 leading-relaxed whitespace-pre-wrap`
    : `${compact ? 'text-xs' : 'text-sm'} text-muted leading-relaxed whitespace-pre-wrap`

  return (
    <div className={compact ? 'space-y-1' : 'space-y-2'}>
      <div>
        <p className={labelClass}>Name</p>
        <p className={valueClass}>{job.client_name}</p>
      </div>
      <div>
        <p className={labelClass}>Current status</p>
        <p className={metaClass}>{currentStatus}</p>
      </div>
      <div>
        <p className={labelClass}>Notes</p>
        <p className={notesClass}>
          {creationNotes ?? (
            <span className={selected ? 'italic opacity-75' : 'text-muted-dim italic'}>
              No notes on file
            </span>
          )}
        </p>
      </div>
    </div>
  )
}

export function ProjectJobsList({
  jobs,
  projectNotes,
  workflow,
  selectedId,
  onSelect,
  variant = 'sidebar',
}: Props) {
  if (variant === 'summary') {
    const job = jobs.find((j) => j.id === selectedId) ?? jobs[0]
    if (!job) return null
    return (
      <div className="card p-4 lg:hidden">
        <h2 className="font-bold text-foreground mb-3">Active job</h2>
        <JobDetails
          job={job}
          projectNotes={projectNotes}
          workflow={workflow}
          compact
        />
      </div>
    )
  }

  return (
    <aside className="hidden lg:block lg:col-span-3 card p-3">
      <h2 className="font-bold mb-3 text-foreground">Jobs</h2>
      {jobs.length === 0 ? (
        <p className="text-sm text-muted-dim">No jobs on this project yet.</p>
      ) : (
        <ul className="space-y-2">
          {jobs.map((job) => {
            const isSelected = selectedId === job.id
            return (
              <li key={job.id}>
                <button
                  type="button"
                  onClick={() => onSelect(job)}
                  className={`w-full text-left p-3 rounded-lg transition-colors border ${
                    isSelected
                      ? 'btn-primary text-[#052e16] border-black'
                      : 'bg-surface-elevated border-border hover:border-brand-dim/50'
                  }`}
                >
                  <JobDetails
                    job={job}
                    projectNotes={projectNotes}
                    workflow={workflow}
                    compact
                    selected={isSelected}
                  />
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </aside>
  )
}

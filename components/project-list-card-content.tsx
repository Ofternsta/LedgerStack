'use client'

import { ProjectActiveDurationBadge } from '@/components/project-active-duration-badge'

type Props = {
  customerName: string
  projectAddress: string
  createdAt?: string | null
  jobCount?: number
}

/** Centered client/address on project list cards with job count on the right. */
export function ProjectListCardContent({
  customerName,
  projectAddress,
  createdAt,
  jobCount = 0,
}: Props) {
  const jobsLabel = jobCount === 1 ? 'job' : 'jobs'

  return (
    <div className="relative grid flex-1 min-h-[140px] grid-cols-[1fr_auto] items-center gap-3 px-4 py-4">
      <ProjectActiveDurationBadge createdAt={createdAt} />

      <div className="flex min-w-0 items-center justify-center pr-1">
        <div className="text-center min-w-0">
          <p className="font-bold text-2xl text-brand-bright leading-snug line-clamp-2">
            {customerName}
          </p>
          <p className="text-lg text-muted mt-2 line-clamp-3">{projectAddress}</p>
        </div>
      </div>

      <div
        className="shrink-0 flex flex-col items-center justify-center text-center w-11 sm:w-12"
        aria-label={`${jobCount} ${jobsLabel} in this project`}
      >
        <span className="text-2xl font-bold text-foreground tabular-nums leading-none">
          {jobCount}
        </span>
        <span className="text-[10px] sm:text-xs font-medium text-muted-dim uppercase tracking-wide mt-1">
          {jobsLabel}
        </span>
      </div>
    </div>
  )
}

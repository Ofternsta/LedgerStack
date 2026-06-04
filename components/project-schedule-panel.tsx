'use client'

import Link from 'next/link'
import { ProjectMonthCalendar } from '@/components/project-month-calendar'

type Props = {
  projectId: string
  claimId?: string | null
  canEdit: boolean
}

export function ProjectSchedulePanel({ projectId, claimId, canEdit }: Props) {
  return (
    <section className="border border-border rounded-xl p-4 bg-surface-elevated space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-bold text-lg">Schedule &amp; calendar</h2>
          <p className="text-sm text-muted mt-1">
            Site visits, deadlines, reminders, and follow-ups for this project.
          </p>
        </div>
        <Link
          href={`/calendar?project=${projectId}`}
          className="text-sm font-medium text-brand-bright min-h-[44px] inline-flex items-center"
        >
          Full calendar →
        </Link>
      </div>

      <ProjectMonthCalendar
        projectId={projectId}
        claimId={claimId}
        canEdit={canEdit}
      />
    </section>
  )
}

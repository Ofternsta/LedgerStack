'use client'

import Link from 'next/link'
import { ProjectMonthCalendar } from '@/components/project-month-calendar'

type Props = {
  projectId: string
  canMarkComplete?: boolean
  /** Worker/admin may add events on the full calendar page. */
  canManageEvents?: boolean
}

export function ProjectSchedulePanel({
  projectId,
  canMarkComplete = false,
  canManageEvents = false,
}: Props) {
  return (
    <section className="border border-border rounded-xl p-4 bg-surface-elevated space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-bold text-lg">Schedule &amp; calendar</h2>
          <p className="text-sm text-muted mt-1">
            Site visits, deadlines, reminders, and follow-ups for this project.
            {canManageEvents
              ? ' Use the full calendar to add or edit events.'
              : ''}
          </p>
        </div>
        {canManageEvents && (
          <Link
            href={`/calendar?project=${projectId}`}
            className="text-sm font-medium text-brand-bright min-h-[44px] inline-flex items-center"
          >
            Open calendar →
          </Link>
        )}
      </div>

      <ProjectMonthCalendar
        projectId={projectId}
        canMarkComplete={canMarkComplete}
      />
    </section>
  )
}

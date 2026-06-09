'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import type { ProjectCalendarEvent } from '@/components/project-month-calendar'
import { SCHEDULE_EVENT_LABELS } from '@/lib/schedule-types'

type Props = {
  projectId: string
  canMarkComplete?: boolean
  canManageEvents?: boolean
  variant?: 'panel' | 'sidebar'
}

function upcomingSevenDayRange() {
  const from = new Date()
  const to = new Date()
  to.setDate(to.getDate() + 7)
  return { from: from.toISOString(), to: to.toISOString() }
}

function formatUpcomingWhen(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function ProjectSchedulePanel({
  projectId,
  canMarkComplete = false,
  canManageEvents = false,
  variant = 'panel',
}: Props) {
  const [events, setEvents] = useState<ProjectCalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadEvents = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { from, to } = upcomingSevenDayRange()
    const params = new URLSearchParams({
      project_id: projectId,
      from,
      to,
    })
    const res = await fetch(`/api/schedule?${params}`)
    const payload = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(payload.error || 'Could not load events')
      setEvents([])
    } else {
      setEvents(payload.events || [])
    }
    setLoading(false)
  }, [projectId])

  useEffect(() => {
    void loadEvents()
  }, [loadEvents])

  async function toggleComplete(ev: ProjectCalendarEvent) {
    if (!canMarkComplete) return
    const res = await fetch('/api/schedule', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: ev.id,
        project_id: projectId,
        completed_at: ev.completed_at ? null : new Date().toISOString(),
      }),
    })
    if (res.ok) await loadEvents()
  }

  const isSidebar = variant === 'sidebar'
  const Wrapper = isSidebar ? 'div' : 'section'
  const wrapperClass = isSidebar
    ? 'space-y-3'
    : 'border border-border rounded-xl p-4 bg-surface-elevated space-y-4'

  return (
    <Wrapper className={wrapperClass}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2
            className={
              isSidebar ? 'font-bold text-foreground' : 'font-bold text-lg'
            }
          >
            Schedule &amp; calendar
          </h2>
          <p className="text-xs text-muted mt-1">
            Upcoming events in the next 7 days.
          </p>
        </div>
        {canManageEvents && (
          <Link
            href={`/calendar?project=${projectId}`}
            className="text-sm font-medium text-brand-bright min-h-[40px] inline-flex items-center shrink-0"
          >
            Open calendar →
          </Link>
        )}
      </div>

      {error && (
        <p className="text-sm alert-error rounded-lg p-2">{error}</p>
      )}

      {loading && (
        <p className="text-sm text-muted-dim">Loading events…</p>
      )}

      {!loading && events.length === 0 && (
        <p className="text-sm text-muted-dim">
          No upcoming events in the next 7 days.
          {canManageEvents ? ' Add events on the full calendar.' : ''}
        </p>
      )}

      {!loading && events.length > 0 && (
        <ul className="space-y-2">
          {events.map((ev) => (
            <li
              key={ev.id}
              className="flex items-start gap-2 border border-border rounded-lg p-3 bg-surface"
            >
              {canMarkComplete && (
                <input
                  type="checkbox"
                  checked={Boolean(ev.completed_at)}
                  onChange={() => void toggleComplete(ev)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-brand"
                  aria-label={`Mark "${ev.title}" complete`}
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm text-foreground leading-snug">
                  {ev.title}
                </p>
                <p className="text-xs text-muted-dim mt-0.5">
                  {SCHEDULE_EVENT_LABELS[ev.event_type]} ·{' '}
                  {formatUpcomingWhen(ev.starts_at)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Wrapper>
  )
}

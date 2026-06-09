'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  buildMonthGrid,
  dayKey,
  isToday,
  monthRange,
  monthTitle,
  sameCalendarDay,
  shiftMonth,
  startOfDay,
  weekdayLabels,
} from '@/lib/calendar-month'
import {
  SCHEDULE_EVENT_LABELS,
  SCHEDULE_EVENT_TYPES,
  type ScheduleEventType,
} from '@/lib/schedule-types'

export type ProjectCalendarEvent = {
  id: string
  project_id: string
  title: string
  event_type: ScheduleEventType
  description: string | null
  starts_at: string
  completed_at: string | null
}

type ProjectMonthCalendarProps = {
  projectId: string
  /** Attached to new events when created from a job context. */
  claimId?: string | null
  canAddEvents?: boolean
  canDeleteEvents?: boolean
  canMarkComplete?: boolean
}

function formatDayHeading(date: Date): string {
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatEventTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function ProjectMonthCalendar({
  projectId,
  claimId,
  canAddEvents = false,
  canDeleteEvents = false,
  canMarkComplete = false,
}: ProjectMonthCalendarProps) {
  const [viewMonth, setViewMonth] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })
  const [events, setEvents] = useState<ProjectCalendarEvent[]>([])
  const [loadingEvents, setLoadingEvents] = useState(false)
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [eventType, setEventType] = useState<ScheduleEventType>('inspection')
  const [title, setTitle] = useState('')
  const [eventTime, setEventTime] = useState('09:00')

  const eventsByDay = useMemo(() => {
    const map = new Map<string, ProjectCalendarEvent[]>()
    for (const ev of events) {
      const key = dayKey(new Date(ev.starts_at))
      const list = map.get(key) || []
      list.push(ev)
      map.set(key, list)
    }
    for (const list of map.values()) {
      list.sort(
        (a, b) =>
          new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
      )
    }
    return map
  }, [events])

  const loadEvents = useCallback(async () => {
    setLoadingEvents(true)
    setError(null)
    const { from, to } = monthRange(viewMonth)
    const params = new URLSearchParams({
      project_id: projectId,
      from,
      to,
      include_completed: '1',
    })
    const res = await fetch(`/api/schedule?${params}`)
    const payload = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(payload.error || 'Could not load events')
      setEvents([])
    } else {
      setEvents(payload.events || [])
    }
    setLoadingEvents(false)
  }, [projectId, viewMonth])

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

  async function addEventForDay(e: React.FormEvent) {
    e.preventDefault()
    if (!canAddEvents || !selectedDay || !title.trim()) return
    setSaving(true)
    setError(null)

    const [hours, minutes] = eventTime.split(':').map(Number)
    const starts = new Date(selectedDay)
    starts.setHours(hours || 9, minutes || 0, 0, 0)

    const res = await fetch('/api/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_id: projectId,
        claim_id: claimId || null,
        event_type: eventType,
        title: title.trim(),
        starts_at: starts.toISOString(),
      }),
    })
    const payload = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(payload.error || 'Could not save event')
      setSaving(false)
      return
    }
    setTitle('')
    setEventType('inspection')
    setEventTime('09:00')
    await loadEvents()
    setSaving(false)
  }

  async function deleteEvent(ev: ProjectCalendarEvent) {
    if (!canDeleteEvents) return
    if (
      !window.confirm(`Delete "${ev.title}"? This cannot be undone.`)
    ) {
      return
    }
    setDeletingId(ev.id)
    setError(null)
    const params = new URLSearchParams({
      id: ev.id,
      project_id: projectId,
    })
    const res = await fetch(`/api/schedule?${params}`, { method: 'DELETE' })
    const payload = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(payload.error || 'Could not delete event')
    } else {
      await loadEvents()
    }
    setDeletingId(null)
  }

  function openDay(date: Date, inMonth: boolean) {
    if (!inMonth) {
      setViewMonth(new Date(date.getFullYear(), date.getMonth(), 1))
      setSelectedDay(startOfDay(date))
      return
    }
    setSelectedDay(startOfDay(date))
  }

  const grid = buildMonthGrid(viewMonth)
  const selectedDayEvents = selectedDay
    ? eventsByDay.get(dayKey(selectedDay)) || []
    : []

  return (
    <div className="space-y-4">
      {error && (
        <p className="text-sm alert-error rounded-lg p-2">{error}</p>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => {
              setViewMonth((m) => shiftMonth(m, -1))
              setSelectedDay(null)
            }}
            className="border border-border rounded-lg px-3 py-2 text-sm min-h-[44px]"
            aria-label="Previous month"
          >
            ←
          </button>
          <h3 className="font-bold text-lg text-foreground text-center">
            {monthTitle(viewMonth)}
          </h3>
          <button
            type="button"
            onClick={() => {
              setViewMonth((m) => shiftMonth(m, 1))
              setSelectedDay(null)
            }}
            className="border border-border rounded-lg px-3 py-2 text-sm min-h-[44px]"
            aria-label="Next month"
          >
            →
          </button>
        </div>

        {loadingEvents && (
          <p className="text-xs text-muted-dim text-center">Loading events…</p>
        )}

        <div className="grid grid-cols-7 gap-1 text-center">
          {weekdayLabels().map((label) => (
            <div
              key={label}
              className="text-xs font-semibold text-muted py-1"
            >
              {label}
            </div>
          ))}
          {grid.map((cell) => {
            const key = dayKey(cell.date)
            const dayEvents = eventsByDay.get(key) || []
            const hasEvents = dayEvents.length > 0
            const selected =
              selectedDay !== null && sameCalendarDay(cell.date, selectedDay)
            const todayInMonth = isToday(cell.date) && cell.inMonth

            let cellClass =
              'aspect-square md:aspect-auto md:min-h-[80px] rounded-lg border p-1 flex flex-col max-md:items-center max-md:justify-center max-md:p-0.5 text-left'
            if (!cell.inMonth) {
              cellClass += ' border-transparent bg-surface/40 text-muted-dim'
            } else {
              cellClass += ' border-border bg-surface'
              if (todayInMonth) {
                cellClass += ' bg-brand/10'
                if (!hasEvents) {
                  cellClass += ' border-brand-dim/40'
                }
              }
              if (hasEvents) {
                cellClass += ' max-md:border-2 max-md:border-brand-bright'
              }
            }
            if (selected) {
              cellClass += ' ring-2 ring-brand-bright border-brand-dim'
            }

            const dayLabel = hasEvents
              ? `${cell.day}, ${dayEvents.length} scheduled event${dayEvents.length === 1 ? '' : 's'}`
              : String(cell.day)

            return (
              <button
                key={key}
                type="button"
                onClick={() => openDay(cell.date, cell.inMonth)}
                className={cellClass}
                aria-label={dayLabel}
              >
                <span
                  className={`text-sm font-semibold ${
                    cell.inMonth ? 'text-foreground' : 'text-muted-dim'
                  }`}
                >
                  {cell.day}
                </span>
                <span className="hidden md:flex flex-1 mt-1 space-y-0.5 overflow-hidden min-h-0 flex-col w-full">
                  {dayEvents.slice(0, 2).map((ev) => (
                    <span
                      key={ev.id}
                      className={`block text-[10px] leading-tight truncate rounded px-0.5 ${
                        ev.completed_at
                          ? 'line-through text-muted-dim'
                          : 'text-brand-bright'
                      }`}
                    >
                      {ev.title}
                    </span>
                  ))}
                  {dayEvents.length > 2 && (
                    <span className="block text-[10px] text-muted-dim">
                      +{dayEvents.length - 2} more
                    </span>
                  )}
                </span>
                {hasEvents && (
                  <span className="hidden md:block text-[10px] leading-tight text-muted-dim truncate mt-auto pt-0.5">
                    {dayEvents
                      .slice(0, 2)
                      .map((ev) => formatEventTime(ev.starts_at))
                      .join(' · ')}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {(canAddEvents || canMarkComplete) && (
          <p className="text-xs text-muted">
            {canAddEvents
              ? 'Click a day to view events or add a new one.'
              : 'Click a day to view scheduled events.'}
          </p>
        )}
      </div>

      {selectedDay && (
        <div className="border border-border rounded-xl p-4 bg-surface space-y-4">
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-bold text-foreground">
              {formatDayHeading(selectedDay)}
            </h4>
            <button
              type="button"
              onClick={() => setSelectedDay(null)}
              className="text-sm text-muted hover:text-foreground min-h-[44px]"
            >
              Close
            </button>
          </div>

          {selectedDayEvents.length === 0 ? (
            <p className="text-sm text-muted-dim">No events this day.</p>
          ) : (
            <ul className="space-y-2">
              {selectedDayEvents.map((ev) => (
                <li
                  key={ev.id}
                  className={`flex items-start gap-3 border border-border rounded-lg p-3 ${
                    ev.completed_at ? 'opacity-70' : ''
                  }`}
                >
                  {canMarkComplete && (
                    <input
                      type="checkbox"
                      checked={Boolean(ev.completed_at)}
                      onChange={() => void toggleComplete(ev)}
                      className="mt-1 h-4 w-4 shrink-0 accent-brand"
                      aria-label={`Mark "${ev.title}" complete`}
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p
                      className={`font-medium text-sm ${
                        ev.completed_at ? 'line-through text-muted' : ''
                      }`}
                    >
                      {ev.title}
                    </p>
                    <p className="text-xs text-muted-dim mt-0.5">
                      {SCHEDULE_EVENT_LABELS[ev.event_type]} ·{' '}
                      {formatEventTime(ev.starts_at)}
                    </p>
                  </div>
                  {canDeleteEvents && (
                    <button
                      type="button"
                      onClick={() => void deleteEvent(ev)}
                      disabled={deletingId === ev.id}
                      className="text-xs text-red-700 border border-red-200 rounded-lg px-2 py-1 min-h-[32px] shrink-0 hover:bg-red-50 disabled:opacity-50"
                    >
                      {deletingId === ev.id ? '…' : 'Delete'}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}

          {canAddEvents && (
            <form
              onSubmit={(e) => void addEventForDay(e)}
              className="border-t border-border pt-4 space-y-3"
            >
              <p className="text-sm font-semibold text-foreground">Add event</p>
              <select
                value={eventType}
                onChange={(e) =>
                  setEventType(e.target.value as ScheduleEventType)
                }
                className="w-full border border-border rounded-xl p-3 bg-surface-elevated"
              >
                {SCHEDULE_EVENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {SCHEDULE_EVENT_LABELS[t]}
                  </option>
                ))}
              </select>
              <input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Event title"
                className="w-full border border-border rounded-xl p-3 bg-surface-elevated"
              />
              <label className="block text-sm font-medium text-muted">
                Time
                <input
                  type="time"
                  value={eventTime}
                  onChange={(e) => setEventTime(e.target.value)}
                  className="mt-1 w-full border border-border rounded-xl p-3 bg-surface-elevated"
                />
              </label>
              <button
                type="submit"
                disabled={saving || !title.trim()}
                className="w-full btn-primary py-3 rounded-xl font-medium disabled:opacity-50 min-h-[48px]"
              >
                {saving ? 'Saving…' : 'Save event'}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  )
}

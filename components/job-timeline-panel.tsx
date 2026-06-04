'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { LegalNotice } from '@/components/legal-notice'
import {
  formatEventWhen,
  formatTimelineSource,
  type TimelineEvent,
} from '@/components/timeline-list'
import { isUnlimited } from '@/lib/plan-entitlements'

type JobTimelinePanelProps = {
  claimId: string
  projectId: string
  jobLabel?: string
  timelineRefreshKey?: number
  canGenerate: boolean
  aiSummariesLimit: number
  aiSummariesUsed: number
}

function eventSortTime(e: TimelineEvent): number {
  const raw = e.created_at || e.event_date
  const t = Date.parse(raw)
  return Number.isNaN(t) ? 0 : t
}

export function JobTimelinePanel({
  claimId,
  projectId,
  jobLabel,
  timelineRefreshKey = 0,
  canGenerate,
  aiSummariesLimit,
  aiSummariesUsed,
}: JobTimelinePanelProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [loadingTimeline, setLoadingTimeline] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const aiAtLimit =
    !isUnlimited(aiSummariesLimit) && aiSummariesUsed >= aiSummariesLimit

  const timelineHref = useMemo(() => {
    const params = new URLSearchParams({ claim_id: claimId })
    if (jobLabel?.trim()) params.set('job', jobLabel.trim())
    return `/project/${projectId}/timeline?${params}`
  }, [claimId, projectId, jobLabel])

  const loadTimeline = useCallback(async () => {
    if (!claimId) return
    setLoadingTimeline(true)
    setError(null)
    const res = await fetch(
      `/api/claim-timeline?claim_id=${claimId}&project_id=${projectId}`
    )
    const payload = await res.json().catch(() => ({}))
    if (res.ok) {
      setEvents(payload.events || [])
    } else {
      setError(payload.error || 'Could not load timeline')
    }
    setLoadingTimeline(false)
  }, [claimId, projectId])

  useEffect(() => {
    loadTimeline()
  }, [loadTimeline, timelineRefreshKey])

  const latestEvent = useMemo(() => {
    if (!events.length) return null
    return [...events].sort((a, b) => eventSortTime(b) - eventSortTime(a))[0]
  }, [events])

  async function regenerateTimeline() {
    if (!canGenerate || aiAtLimit) return
    setLoadingTimeline(true)
    setError(null)
    const res = await fetch('/api/claim-timeline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        claim_id: claimId,
        project_id: projectId,
        persist: true,
      }),
    })
    const payload = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(payload.error || 'Could not generate timeline')
    } else {
      await loadTimeline()
    }
    setLoadingTimeline(false)
  }

  return (
    <section className="border border-border rounded-xl p-4 bg-surface-elevated space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-bold text-lg text-foreground">Job timeline</h2>
        {canGenerate && (
          <button
            type="button"
            onClick={() => void regenerateTimeline()}
            disabled={loadingTimeline || aiAtLimit}
            className="text-sm border border-border px-3 py-2 rounded-lg min-h-[40px] disabled:opacity-50"
          >
            {loadingTimeline ? 'Updating…' : 'Refresh timeline'}
          </button>
        )}
      </div>

      {!isUnlimited(aiSummariesLimit) && (
        <p className="text-xs text-muted">
          AI summaries this month: {aiSummariesUsed} / {aiSummariesLimit}
          {aiAtLimit && ' — limit reached. Upgrade for more.'}
        </p>
      )}

      {error && (
        <p className="text-sm alert-error rounded-lg p-2">{error}</p>
      )}

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-foreground">Latest update</p>
          {events.length > 0 && (
            <Link
              href={timelineHref}
              className="text-xs border border-border px-2.5 py-1.5 rounded-lg hover:border-brand-dim/50 inline-flex items-center min-h-[32px]"
            >
              View full timeline
            </Link>
          )}
        </div>

        {loadingTimeline && !latestEvent && (
          <p className="text-sm text-muted-dim">Loading…</p>
        )}

        {!loadingTimeline && !latestEvent && (
          <p className="text-sm text-muted-dim">
            Upload documents or change job status to build history. Use Refresh
            timeline to add AI-derived milestones from files.
          </p>
        )}

        {latestEvent && (
          <div className="border border-border rounded-lg p-3 bg-surface">
            <p className="text-xs text-muted-dim">{formatEventWhen(latestEvent)}</p>
            <p className="font-medium text-sm text-foreground mt-0.5">
              {latestEvent.title}
            </p>
            {latestEvent.description && (
              <p className="text-sm text-muted mt-1">{latestEvent.description}</p>
            )}
            {formatTimelineSource(latestEvent.source) && (
              <p className="text-[10px] uppercase tracking-wide text-muted-dim mt-2">
                {formatTimelineSource(latestEvent.source)}
              </p>
            )}
          </div>
        )}
      </div>

      <LegalNotice id="ai" />
    </section>
  )
}

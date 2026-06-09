'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import {
  TimelineList,
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
  embedded?: boolean
}

export function JobTimelinePanel({
  claimId,
  projectId,
  jobLabel,
  timelineRefreshKey = 0,
  canGenerate,
  aiSummariesLimit,
  aiSummariesUsed,
  embedded = false,
}: JobTimelinePanelProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [loadingTimeline, setLoadingTimeline] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const aiAtLimit =
    !isUnlimited(aiSummariesLimit) && aiSummariesUsed >= aiSummariesLimit

  const timelineHref = (() => {
    const params = new URLSearchParams({ claim_id: claimId })
    if (jobLabel?.trim()) params.set('job', jobLabel.trim())
    return `/project/${projectId}/timeline?${params}`
  })()

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

  const Wrapper = embedded ? 'div' : 'section'
  const wrapperClass = embedded
    ? 'space-y-4'
    : 'border border-border rounded-xl p-4 bg-surface-elevated space-y-4'

  return (
    <Wrapper className={wrapperClass}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2
          className={
            embedded
              ? 'text-sm font-bold uppercase tracking-wide text-muted-dim'
              : 'font-bold text-lg text-foreground'
          }
        >
          Job timeline
        </h2>
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
          <p className="text-sm font-semibold text-foreground">
            Activity history
            {events.length > 0 ? (
              <span className="font-normal text-muted">
                {' '}
                · {events.length} {events.length === 1 ? 'entry' : 'entries'}
              </span>
            ) : null}
          </p>
          {events.length > 0 && (
            <Link
              href={timelineHref}
              className="text-xs border border-border px-2.5 py-1.5 rounded-lg hover:border-brand-dim/50 inline-flex items-center min-h-[32px]"
            >
              Open full page
            </Link>
          )}
        </div>

        {loadingTimeline && events.length === 0 && (
          <p className="text-sm text-muted-dim">Loading…</p>
        )}

        {!loadingTimeline && events.length === 0 && (
          <p className="text-sm text-muted-dim">
            Upload documents or change job status to build history. Refresh
            timeline adds new AI-derived milestones without removing past
            entries.
          </p>
        )}

        {events.length > 0 && (
          <TimelineList events={events} newestFirst />
        )}
      </div>
    </Wrapper>
  )
}

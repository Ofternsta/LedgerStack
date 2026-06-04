'use client'

import Link from 'next/link'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { LegalNotice } from '@/components/legal-notice'
import { LedgerStackLoader } from '@/components/ledgerstack-loader'
import { ProjectPageHeader } from '@/components/project-page-header'
import {
  TimelineList,
  type TimelineEvent,
} from '@/components/timeline-list'
import { isUnlimited } from '@/lib/plan-entitlements'
import { loadUserAccess } from '@/lib/load-access'
import type { UserAccess } from '@/lib/roles'

export default function ProjectTimelinePage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const projectId = params.id as string
  const claimId = searchParams.get('claim_id') || ''
  const jobLabel = searchParams.get('job') || ''

  const [access, setAccess] = useState<UserAccess | null>(null)
  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canGenerate = Boolean(access?.canUpdateClaimInfo)
  const aiSummariesLimit = access?.aiSummariesLimit ?? 0
  const aiSummariesUsed = access?.aiSummariesUsed ?? 0
  const aiAtLimit =
    !isUnlimited(aiSummariesLimit) && aiSummariesUsed >= aiSummariesLimit

  const loadTimeline = useCallback(async () => {
    if (!claimId) return
    setLoading(true)
    setError(null)
    const res = await fetch(
      `/api/claim-timeline?claim_id=${claimId}&project_id=${projectId}`
    )
    const payload = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(payload.error || 'Could not load timeline')
      setEvents([])
    } else {
      setEvents(payload.events || [])
    }
    setLoading(false)
  }, [claimId, projectId])

  useEffect(() => {
    loadUserAccess().then(({ access: a }) => {
      if (!a || a.role === 'client') {
        router.replace(`/project/${projectId}`)
        return
      }
      setAccess(a)
    })
  }, [projectId, router])

  useEffect(() => {
    if (!claimId) {
      router.replace(`/project/${projectId}`)
    }
  }, [claimId, projectId, router])

  useEffect(() => {
    if (access) loadTimeline()
  }, [access, loadTimeline])

  async function regenerateTimeline() {
    if (!canGenerate || aiAtLimit || !claimId) return
    setRefreshing(true)
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
    setRefreshing(false)
  }

  if (!access || !claimId) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <LedgerStackLoader />
      </div>
    )
  }

  return (
    <div className="min-h-dvh flex flex-col bg-background">
      <ProjectPageHeader
        title={jobLabel ? `${jobLabel} — timeline` : 'Job timeline'}
        location="Full activity history for this job"
        backHref={`/project/${projectId}`}
        backLabel="Back to project"
      />
      <main className="flex-1 safe-x px-4 py-4 max-w-2xl mx-auto w-full pb-8 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted">
            {events.length} {events.length === 1 ? 'entry' : 'entries'}
          </p>
          {canGenerate && (
            <button
              type="button"
              onClick={() => void regenerateTimeline()}
              disabled={loading || refreshing || aiAtLimit}
              className="text-sm border border-border px-3 py-2 rounded-lg min-h-[40px] disabled:opacity-50"
            >
              {refreshing ? 'Updating…' : 'Refresh timeline'}
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

        {loading ? (
          <p className="text-sm text-muted-dim">Loading timeline…</p>
        ) : (
          <TimelineList events={events} newestFirst />
        )}

        <LegalNotice id="ai" />

        <p className="text-center text-sm">
          <Link
            href={`/project/${projectId}`}
            className="text-brand-bright font-medium hover:underline"
          >
            ← Back to project
          </Link>
        </p>
      </main>
    </div>
  )
}

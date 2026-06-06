'use client'

import Link from 'next/link'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { JobIntelligenceSummary } from '@/components/job-intelligence-summary'
import { LedgerStackLoader } from '@/components/ledgerstack-loader'
import { ProjectPageHeader } from '@/components/project-page-header'
import { fetchSavedAiSummary } from '@/lib/ai-summary-storage'
import type { JobIntelligenceReport } from '@/lib/job-intelligence-types'
import { loadUserAccess } from '@/lib/load-access'

export default function ProjectAiSummaryPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const projectId = params.id as string
  const claimId = searchParams.get('claim_id') || ''
  const jobLabel = searchParams.get('job') || 'Job'

  const [report, setReport] = useState<JobIntelligenceReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!claimId) {
      setLoading(false)
      return
    }

    loadUserAccess().then(async ({ access }) => {
      if (!access || access.role === 'client') {
        router.replace(`/project/${projectId}`)
        return
      }

      setLoading(true)
      setError(null)
      const stored = await fetchSavedAiSummary(projectId, claimId)
      if (!stored) {
        setReport(null)
        setError('No saved AI summary for this job yet.')
      } else {
        setReport(stored)
      }
      setLoading(false)
    })
  }, [projectId, claimId, router])

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <LedgerStackLoader />
      </div>
    )
  }

  return (
    <div className="min-h-dvh flex flex-col bg-background">
      <ProjectPageHeader
        title="AI summary"
        location={jobLabel}
        backHref={`/project/${projectId}`}
        backLabel="Back to project"
      />

      <main className="flex-1 safe-x px-4 py-4 max-w-3xl mx-auto w-full pb-8 space-y-4">
        {!claimId ? (
          <p className="text-sm text-muted">
            No job selected. Open a project, choose a job, and generate an AI
            summary first.
          </p>
        ) : !report ? (
          <div className="border border-border rounded-xl p-5 bg-surface-elevated space-y-3">
            <p className="text-sm text-foreground">
              {error || 'No AI summary is available for this job yet.'}
            </p>
            <Link
              href={`/project/${projectId}`}
              className="inline-flex text-sm font-medium text-brand-bright min-h-[44px] items-center"
            >
              ← Back to project to generate one
            </Link>
          </div>
        ) : (
          <JobIntelligenceSummary report={report} />
        )}
      </main>
    </div>
  )
}

'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { LegalNotice } from '@/components/legal-notice'
import type { JobIntelligenceReport } from '@/lib/job-intelligence-types'
import {
  loadAiSummaryReport,
  saveAiSummaryReport,
} from '@/lib/ai-summary-storage'
import { isUnlimited } from '@/lib/plan-entitlements'

type ProjectAiExportSectionProps = {
  claimId: string
  projectId: string
  jobLabel?: string
  canGenerate: boolean
  canExportPdf: boolean
  canExportHtml: boolean
  aiSummariesLimit: number
  aiSummariesUsed: number
}

export function ProjectAiExportSection({
  claimId,
  projectId,
  jobLabel = 'Job',
  canGenerate,
  canExportPdf,
  canExportHtml,
  aiSummariesLimit,
  aiSummariesUsed,
}: ProjectAiExportSectionProps) {
  const [report, setReport] = useState<JobIntelligenceReport | null>(null)
  const [summaryReady, setSummaryReady] = useState(false)
  const [loadingSummary, setLoadingSummary] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const aiAtLimit =
    !isUnlimited(aiSummariesLimit) && aiSummariesUsed >= aiSummariesLimit

  const summaryViewHref = `/project/${projectId}/ai-summary?claim_id=${encodeURIComponent(claimId)}&job=${encodeURIComponent(jobLabel)}`

  useEffect(() => {
    setError(null)
    const stored = loadAiSummaryReport(projectId, claimId)
    if (stored) {
      setReport(stored)
      setSummaryReady(true)
    } else {
      setReport(null)
      setSummaryReady(false)
    }
  }, [claimId, projectId])

  async function generateSummary() {
    if (!canGenerate || aiAtLimit) return
    setLoadingSummary(true)
    setError(null)

    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
    const res = await fetch('/api/claim-summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        claim_id: claimId,
        project_id: projectId,
        timezone: timeZone,
      }),
    })
    const payload = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(payload.error || 'Could not generate summary')
    } else if (payload.report) {
      const nextReport = payload.report as JobIntelligenceReport
      setReport(nextReport)
      saveAiSummaryReport(projectId, claimId, nextReport)
      setSummaryReady(true)
    }
    setLoadingSummary(false)
  }

  async function exportReport(format: 'pdf' | 'html') {
    if (report) {
      const res = await fetch('/api/export-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          claim_id: claimId,
          project_id: projectId,
          format,
          report,
        }),
      })
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))
        setError(payload.error || 'Export failed')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download =
        format === 'pdf'
          ? `project-report-${report.jobLabel.replace(/[^a-zA-Z0-9.-]/g, '_')}.pdf`
          : `project-report-${report.jobLabel.replace(/[^a-zA-Z0-9.-]/g, '_')}.html`
      if (format === 'html') {
        window.open(url, '_blank')
        window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
      } else {
        a.click()
        URL.revokeObjectURL(url)
      }
      return
    }

    const url = `/api/export-report?claim_id=${claimId}&project_id=${projectId}&format=${format}`
    window.open(url, '_blank')
  }

  const showSection =
    canGenerate || canExportPdf || canExportHtml || summaryReady

  if (!showSection) return null

  return (
    <section className="border border-brand-dim/40 rounded-xl p-4 bg-surface-elevated space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-bold text-lg text-foreground">
            AI summary &amp; export
          </h2>
          <p className="text-xs text-muted mt-1">
            Full project report for the selected job — status, timeline, notes,
            calendar, and documents.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canGenerate && (
            <button
              type="button"
              onClick={generateSummary}
              disabled={loadingSummary || aiAtLimit}
              className="text-sm btn-primary text-[#052e16] px-3 py-2 rounded-lg min-h-[40px] disabled:opacity-50"
            >
              {loadingSummary ? 'Generating…' : 'Generate AI summary'}
            </button>
          )}
          {summaryReady && (
            <Link
              href={summaryViewHref}
              className="text-sm btn-primary text-[#052e16] px-3 py-2 rounded-lg min-h-[40px] inline-flex items-center"
            >
              View AI summary
            </Link>
          )}
          {canExportPdf && report && (
            <button
              type="button"
              onClick={() => exportReport('pdf')}
              className="text-sm border border-border px-3 py-2 rounded-lg min-h-[40px]"
            >
              Export PDF
            </button>
          )}
          {canExportHtml && !canExportPdf && report && (
            <button
              type="button"
              onClick={() => exportReport('html')}
              className="text-sm border border-border px-3 py-2 rounded-lg min-h-[40px]"
            >
              Export HTML
            </button>
          )}
        </div>
      </div>

      {!isUnlimited(aiSummariesLimit) && canGenerate && (
        <p className="text-xs text-muted">
          AI summaries this month: {aiSummariesUsed} / {aiSummariesLimit}
          {aiAtLimit && ' — limit reached. Upgrade for more.'}
        </p>
      )}

      {error && (
        <p className="text-sm alert-error rounded-lg p-2">{error}</p>
      )}

      {!summaryReady && canGenerate && !loadingSummary && (
        <p className="text-sm text-muted-dim">
          Generate a categorized summary, then open it on the dedicated AI
          summary page. Export uses that same report.
        </p>
      )}

      {summaryReady && report && (
        <p className="text-sm text-muted">
          Latest summary for {jobLabel}
          {report.generatedAt
            ? ` (generated ${new Date(report.generatedAt).toLocaleString(undefined, {
                dateStyle: 'medium',
                timeStyle: 'short',
              })})`
            : ''}
          . Generate again to replace it.{' '}
          <Link href={summaryViewHref} className="text-brand-bright font-medium">
            View AI summary →
          </Link>
        </p>
      )}

      {(canExportPdf || canExportHtml) && <LegalNotice id="export-backup" />}
      {canGenerate && <LegalNotice id="ai" />}
    </section>
  )
}

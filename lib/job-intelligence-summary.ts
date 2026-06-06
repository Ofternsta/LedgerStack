import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import { gatherJobIntelligenceContext } from '@/lib/gather-job-intelligence'
import { formatReportWhen } from '@/lib/format-report-datetime'
import {
  buildFallbackOverview,
  generateOverviewWithGroq,
} from '@/lib/job-intelligence-overview'
import {
  JOB_INTELLIGENCE_SECTION_TITLES,
  type JobIntelligenceContext,
  type JobIntelligenceReport,
  type JobIntelligenceSection,
} from '@/lib/job-intelligence-types'
import { normalizePdfCharacters, sanitizeReportText } from '@/lib/pdf-text'
import {
  joinSectionEntries,
  normalizeReportBodies,
} from '@/lib/report-body-format'

export function buildFallbackReport(
  ctx: JobIntelligenceContext,
  timeZone?: string
): JobIntelligenceReport {
  const focusClaimId = String(ctx.claim.id || '')
  const focusEvidence = ctx.evidence.filter((e) => e.claim_id === focusClaimId)

  const projectBody = [
    `Customer: ${ctx.project.customer_name}`,
    `Address: ${ctx.project.project_address}`,
    `Project started: ${formatReportWhen(String(ctx.project.created_at || ''), timeZone)}`,
    ctx.project.notes
      ? `Legacy project description: ${ctx.project.notes}`
      : null,
    `${ctx.allClaims.length} job(s) on this project.`,
    ...ctx.allClaims.map(
      (c) =>
        `• ${c.client_name} — ${c.status} (job #${c.claim_number})`
    ),
  ]
    .filter(Boolean)
    .join('\n')

  const statusBody = [
    `Current status: ${ctx.claim.status}`,
    `Loss type: ${ctx.claim.loss_type}`,
    `Insurer: ${ctx.claim.insurance_company}`,
    `Job number: ${ctx.claim.claim_number}`,
    ctx.claim.notes ? `Job description: ${ctx.claim.notes}` : null,
  ]
    .filter(Boolean)
    .join('\n')

  const timelineBody =
    ctx.timelineEvents.length === 0
      ? 'No timeline entries yet.'
      : joinSectionEntries(
          ctx.timelineEvents.map((e) => {
            const when = formatReportWhen(e.created_at || e.event_date, timeZone)
            const title = sanitizeReportText(String(e.title || ''))
            const description = sanitizeReportText(String(e.description || ''))
            const detail = description ? `${title}: ${description}` : title
            return `${when}: ${detail}`
          })
        )

  const notesBody =
    ctx.internalNotes.length === 0
      ? 'No internal notes.'
      : joinSectionEntries(
          ctx.internalNotes.map(
            (n) =>
              `${formatReportWhen(n.created_at, timeZone)} — ${n.author_name} (${n.note_kind}): ${n.body}`
          )
        )

  const scheduleBody =
    ctx.scheduleEvents.length === 0
      ? 'No scheduled events.'
      : joinSectionEntries(
          ctx.scheduleEvents.map((ev) => {
            const done = ev.completed_at ? ' (done)' : ''
            return `${formatReportWhen(String(ev.starts_at || ''), timeZone)} — ${ev.title || 'Event'}: ${ev.description || ''}${done}`
          })
        )

  const documentsBody =
    ctx.evidence.length === 0
      ? 'No documents uploaded.'
      : joinSectionEntries([
          `Total documents across project: ${ctx.evidence.length}`,
          `On this job: ${focusEvidence.length}`,
          ...ctx.evidence.map(
            (e) =>
              `${formatReportWhen(e.created_at, timeZone)} — ${e.client_name} [${e.evidence_type}] ${e.file_name}: ${e.summary}`
          ),
        ])

  const sections: JobIntelligenceSection[] = [
    { id: 'project_overview', title: JOB_INTELLIGENCE_SECTION_TITLES.project_overview, body: projectBody },
    { id: 'job_status', title: JOB_INTELLIGENCE_SECTION_TITLES.job_status, body: statusBody },
    { id: 'timeline', title: JOB_INTELLIGENCE_SECTION_TITLES.timeline, body: timelineBody },
    { id: 'internal_notes', title: JOB_INTELLIGENCE_SECTION_TITLES.internal_notes, body: notesBody },
    { id: 'schedule', title: JOB_INTELLIGENCE_SECTION_TITLES.schedule, body: scheduleBody },
    { id: 'documents', title: JOB_INTELLIGENCE_SECTION_TITLES.documents, body: documentsBody },
  ]

  return {
    generatedAt: new Date().toISOString(),
    overview: buildFallbackOverview(ctx, timeZone),
    sections,
    claimId: focusClaimId,
    projectId: String(ctx.project.id),
    projectName: String(ctx.project.customer_name || 'Project'),
    jobLabel: String(ctx.claim.client_name || 'Job'),
  }
}

export async function generateJobIntelligenceReport(
  supabase: SupabaseClient,
  projectId: string,
  claimId: string,
  options?: { timeZone?: string }
): Promise<JobIntelligenceReport | null> {
  const ctx = await gatherJobIntelligenceContext(supabase, projectId, claimId)
  if (!ctx) return null

  const timeZone = options?.timeZone
  const factual = normalizeReportBodies(buildFallbackReport(ctx, timeZone))
  const overview =
    (await generateOverviewWithGroq(ctx, timeZone)) ??
    buildFallbackOverview(ctx, timeZone)

  return {
    ...factual,
    overview: normalizePdfCharacters(overview),
  }
}

/** Flat text for legacy callers. */
export function reportToPlainText(report: JobIntelligenceReport): string {
  const parts = [
    ...report.sections.map((s) => `${s.title}\n${s.body}`),
    `AI summary\n${report.overview}`,
  ]
  return parts.join('\n\n')
}

import type { JobIntelligenceReport } from '@/lib/job-intelligence-types'

/** List sections built from database rows — keep factual formatting, not AI prose. */
export const STRUCTURED_REPORT_SECTION_IDS = [
  'timeline',
  'internal_notes',
  'messages',
  'schedule',
  'documents',
] as const

export function mergeStructuredReportSections(
  ai: JobIntelligenceReport,
  factual: JobIntelligenceReport
): JobIntelligenceReport {
  const factualById = new Map(factual.sections.map((s) => [s.id, s]))
  return {
    ...ai,
    sections: ai.sections.map((s) => factualById.get(s.id) ?? s),
  }
}

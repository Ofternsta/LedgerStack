import type { JobIntelligenceReport } from '@/lib/job-intelligence-types'

export function aiSummaryStorageKey(projectId: string, claimId: string): string {
  return `ledgerstack-ai-summary:${projectId}:${claimId}`
}

export function saveAiSummaryReport(
  projectId: string,
  claimId: string,
  report: JobIntelligenceReport
): void {
  if (typeof sessionStorage === 'undefined') return
  sessionStorage.setItem(
    aiSummaryStorageKey(projectId, claimId),
    JSON.stringify(report)
  )
}

export function loadAiSummaryReport(
  projectId: string,
  claimId: string
): JobIntelligenceReport | null {
  if (typeof sessionStorage === 'undefined') return null
  const raw = sessionStorage.getItem(aiSummaryStorageKey(projectId, claimId))
  if (!raw) return null
  try {
    return JSON.parse(raw) as JobIntelligenceReport
  } catch {
    return null
  }
}

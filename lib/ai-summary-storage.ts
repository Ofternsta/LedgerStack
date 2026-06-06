import type { JobIntelligenceReport } from '@/lib/job-intelligence-types'

export async function fetchSavedAiSummary(
  projectId: string,
  claimId: string
): Promise<JobIntelligenceReport | null> {
  const params = new URLSearchParams({
    project_id: projectId,
    claim_id: claimId,
  })
  const res = await fetch(`/api/claim-summary?${params.toString()}`)
  if (!res.ok) return null
  const payload = await res.json().catch(() => ({}))
  return (payload.report as JobIntelligenceReport) || null
}

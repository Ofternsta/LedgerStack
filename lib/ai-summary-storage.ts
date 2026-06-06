import type { JobIntelligenceReport } from '@/lib/job-intelligence-types'

export function aiSummaryStorageKey(projectId: string, claimId: string): string {
  return `ledgerstack-ai-summary:${projectId}:${claimId}`
}

function readStoredReport(key: string): JobIntelligenceReport | null {
  if (typeof window === 'undefined') return null

  const storages: Storage[] = []
  try {
    storages.push(localStorage)
  } catch {
    /* private browsing */
  }
  try {
    storages.push(sessionStorage)
  } catch {
    /* unavailable */
  }

  for (const storage of storages) {
    const raw = storage.getItem(key)
    if (!raw) continue
    try {
      const report = JSON.parse(raw) as JobIntelligenceReport
      if (storage !== localStorage) {
        try {
          localStorage.setItem(key, raw)
          storage.removeItem(key)
        } catch {
          /* keep session copy only */
        }
      }
      return report
    } catch {
      storage.removeItem(key)
    }
  }

  return null
}

/** Persist until replaced by a new generation for the same job. */
export function saveAiSummaryReport(
  projectId: string,
  claimId: string,
  report: JobIntelligenceReport
): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(
      aiSummaryStorageKey(projectId, claimId),
      JSON.stringify(report)
    )
  } catch {
    /* quota or private mode */
  }
}

export function loadAiSummaryReport(
  projectId: string,
  claimId: string
): JobIntelligenceReport | null {
  return readStoredReport(aiSummaryStorageKey(projectId, claimId))
}

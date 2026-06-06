import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import type { JobIntelligenceReport } from '@/lib/job-intelligence-types'
import { createServiceClient } from '@/lib/supabase/service'

export async function saveJobAiSummary(
  supabase: SupabaseClient,
  input: {
    organizationId: string
    projectId: string
    claimId: string
    generatedBy: string
    report: JobIntelligenceReport
  }
): Promise<{ error?: string }> {
  const row = {
    organization_id: input.organizationId,
    project_id: input.projectId,
    claim_id: input.claimId,
    report: input.report,
    generated_by: input.generatedBy,
    generated_at: input.report.generatedAt || new Date().toISOString(),
  }

  const { error } = await supabase.from('job_ai_summaries').upsert(row, {
    onConflict: 'project_id,claim_id',
  })

  if (error) return { error: error.message }
  return {}
}

export async function loadJobAiSummary(
  supabase: SupabaseClient,
  projectId: string,
  claimId: string
): Promise<JobIntelligenceReport | null> {
  const { data } = await supabase
    .from('job_ai_summaries')
    .select('report')
    .eq('project_id', projectId)
    .eq('claim_id', claimId)
    .maybeSingle()

  if (!data?.report || typeof data.report !== 'object') return null
  return data.report as JobIntelligenceReport
}

export async function loadJobAiSummaryService(
  projectId: string,
  claimId: string
): Promise<JobIntelligenceReport | null> {
  const service = createServiceClient()
  return loadJobAiSummary(service, projectId, claimId)
}

import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  buildHtmlJobReport,
  buildPdfJobReport,
} from '@/lib/export-report-builders'
import { generateJobIntelligenceReport } from '@/lib/job-intelligence-summary'
import type { JobIntelligenceReport } from '@/lib/job-intelligence-types'
import { loadJobAiSummary } from '@/lib/job-ai-summary-storage-server'
import { consumeAiSummary, refundAiSummary } from '@/lib/plan-enforcement'
import { getOrgPlanContext } from '@/lib/org-plan'
import { assertAdminProjectAiSummaryExportAccess } from '@/lib/project-staff-ai-access'
import { requireAuthUser } from '@/lib/require-auth-user'
import { createServiceClient } from '@/lib/supabase/service'

export const maxDuration = 90

function safeReportFilename(jobLabel: string) {
  return `project-report-${jobLabel}`.replace(/[^a-zA-Z0-9.-]/g, '_')
}

function exportFileResponse(
  report: JobIntelligenceReport,
  format: string
): Promise<NextResponse> | NextResponse {
  const safeName = safeReportFilename(report.jobLabel)

  if (format === 'html') {
    const html = buildHtmlJobReport(report)
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `inline; filename="${safeName}.html"`,
      },
    })
  }

  return buildPdfJobReport(report).then((pdfBytes) => {
    if (pdfBytes) {
      return new NextResponse(pdfBytes, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${safeName}.pdf"`,
        },
      })
    }

    const html = buildHtmlJobReport(report)
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `inline; filename="${safeName}.html"`,
      },
    })
  })
}

async function authorizeExport(
  supabase: SupabaseClient,
  userId: string,
  projectId: string,
  claimId: string
) {
  const access = await assertAdminProjectAiSummaryExportAccess(
    supabase,
    userId,
    projectId
  )
  if (!access.ok) {
    return { error: NextResponse.json({ error: access.error }, { status: access.status }) }
  }

  const { data: project } = await supabase
    .from('projects')
    .select('organization_id')
    .eq('id', projectId)
    .maybeSingle()

  if (!project?.organization_id) {
    return { error: NextResponse.json({ error: 'Project not found' }, { status: 404 }) }
  }

  const planCtx = await getOrgPlanContext(supabase, project.organization_id)
  if (!planCtx) {
    return {
      error: NextResponse.json(
        { error: 'Active subscription required to export.' },
        { status: 403 }
      ),
    }
  }

  const canExport =
    planCtx.entitlements.standardPdfExport ||
    planCtx.entitlements.claimPacketExport

  if (!canExport) {
    return {
      error: NextResponse.json(
        {
          error:
            'Exports are not included on your plan. Upgrade to Starter or higher.',
        },
        { status: 403 }
      ),
    }
  }

  return {
    organizationId: project.organization_id,
    entitlements: planCtx.entitlements,
    claimId,
    projectId,
  }
}

export async function GET(req: Request) {
  try {
    const auth = await requireAuthUser()
    if ('error' in auth) return auth.error
    const { supabase, user } = auth

    const params = new URL(req.url).searchParams
    const claimId = params.get('claim_id')
    const projectId = params.get('project_id')
    const format = params.get('format') || 'pdf'

    if (!claimId || !projectId) {
      return NextResponse.json(
        { error: 'claim_id and project_id required' },
        { status: 400 }
      )
    }

    const authz = await authorizeExport(supabase, user.id, projectId, claimId)
    if ('error' in authz && authz.error) return authz.error

    let report = await loadJobAiSummary(supabase, projectId, claimId)

    if (!report) {
      report = await generateJobIntelligenceReport(
        createServiceClient(),
        projectId,
        claimId
      )
      if (!report) {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 })
      }

      const aiCheck = await consumeAiSummary(
        authz.organizationId,
        authz.entitlements
      )
      if (!aiCheck.ok) {
        return NextResponse.json(
          { error: aiCheck.error, used: aiCheck.used, limit: aiCheck.limit },
          { status: 403 }
        )
      }
    }

    return exportFileResponse(report, format)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Export failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/** Export a saved or freshly generated report. */
export async function POST(req: Request) {
  try {
    const auth = await requireAuthUser()
    if ('error' in auth) return auth.error
    const { supabase, user } = auth

    const body = await req.json().catch(() => ({}))
    const claimId = body.claim_id as string | undefined
    const projectId = body.project_id as string | undefined
    const format = (body.format as string | undefined) || 'pdf'

    if (!claimId || !projectId) {
      return NextResponse.json(
        { error: 'claim_id and project_id required' },
        { status: 400 }
      )
    }

    const authz = await authorizeExport(supabase, user.id, projectId, claimId)
    if ('error' in authz && authz.error) return authz.error

    let report = await loadJobAiSummary(supabase, projectId, claimId)

    if (!report) {
      report = await generateJobIntelligenceReport(
        createServiceClient(),
        projectId,
        claimId
      )
      if (!report) {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 })
      }

      const aiCheck = await consumeAiSummary(
        authz.organizationId,
        authz.entitlements
      )
      if (!aiCheck.ok) {
        return NextResponse.json(
          { error: aiCheck.error, used: aiCheck.used, limit: aiCheck.limit },
          { status: 403 }
        )
      }

      const { saveJobAiSummary } = await import('@/lib/job-ai-summary-storage-server')
      const saved = await saveJobAiSummary(supabase, {
        organizationId: authz.organizationId,
        projectId,
        claimId,
        generatedBy: user.id,
        report,
      })
      if (saved.error) {
        await refundAiSummary(authz.organizationId)
        return NextResponse.json({ error: saved.error }, { status: 500 })
      }
    }

    return exportFileResponse(report, format)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Export failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

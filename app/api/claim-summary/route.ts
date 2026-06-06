import { NextResponse } from 'next/server'
import {
  generateJobIntelligenceReport,
  reportToPlainText,
} from '@/lib/job-intelligence-summary'
import { saveJobAiSummary } from '@/lib/job-ai-summary-storage-server'
import { consumeAiSummary } from '@/lib/plan-enforcement'
import { getOrgPlanContext } from '@/lib/org-plan'
import { assertStaffProjectAiAccess } from '@/lib/project-staff-ai-access'
import { requireAuthUser } from '@/lib/require-auth-user'

export const maxDuration = 90

export async function GET(req: Request) {
  try {
    const auth = await requireAuthUser()
    if ('error' in auth) return auth.error
    const { supabase, user } = auth

    const params = new URL(req.url).searchParams
    const claim_id = params.get('claim_id')
    const project_id = params.get('project_id')

    if (!claim_id || !project_id) {
      return NextResponse.json(
        { error: 'claim_id and project_id required' },
        { status: 400 }
      )
    }

    const access = await assertStaffProjectAiAccess(
      supabase,
      user.id,
      project_id
    )
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status })
    }

    const { loadJobAiSummary } = await import('@/lib/job-ai-summary-storage-server')
    const report = await loadJobAiSummary(supabase, project_id, claim_id)
    if (!report) {
      return NextResponse.json({ error: 'No saved summary for this job.' }, { status: 404 })
    }

    return NextResponse.json({ report })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Summary load failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireAuthUser()
    if ('error' in auth) return auth.error
    const { supabase, user } = auth

    const body = await req.json()
    const claim_id = body.claim_id
    const project_id = body.project_id
    const timeZone =
      typeof body.timezone === 'string' && body.timezone.trim()
        ? body.timezone.trim()
        : undefined

    if (!claim_id || !project_id) {
      return NextResponse.json(
        { error: 'claim_id and project_id required' },
        { status: 400 }
      )
    }

    const access = await assertStaffProjectAiAccess(
      supabase,
      user.id,
      project_id
    )
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status })
    }

    const { data: project } = await supabase
      .from('projects')
      .select('organization_id')
      .eq('id', project_id)
      .maybeSingle()

    if (!project?.organization_id) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const planCtx = await getOrgPlanContext(supabase, project.organization_id)
    if (!planCtx) {
      return NextResponse.json(
        { error: 'Active subscription required for AI summaries.' },
        { status: 403 }
      )
    }

    const report = await generateJobIntelligenceReport(
      supabase,
      project_id,
      claim_id,
      { timeZone }
    )

    if (!report) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    const aiCheck = await consumeAiSummary(
      project.organization_id,
      planCtx.entitlements
    )
    if (!aiCheck.ok) {
      return NextResponse.json(
        { error: aiCheck.error, used: aiCheck.used, limit: aiCheck.limit },
        { status: 403 }
      )
    }

    const saved = await saveJobAiSummary(supabase, {
      organizationId: project.organization_id,
      projectId: project_id,
      claimId: claim_id,
      generatedBy: user.id,
      report,
    })

    if (saved.error) {
      console.error('Failed to persist AI summary:', saved.error)
    }

    return NextResponse.json({
      report,
      summary: reportToPlainText(report),
      saved: !saved.error,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Summary failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

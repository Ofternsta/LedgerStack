import { NextResponse } from 'next/server'
import { generateClaimTimeline } from '@/lib/claim-ai'
import { listEvidence } from '@/lib/evidence-storage'
import { consumeAiSummary, refundAiSummary } from '@/lib/plan-enforcement'
import { getOrgPlanContext } from '@/lib/org-plan'
import { assertAdminProjectTimelineAccess } from '@/lib/project-timeline-access'
import { requireAuthUser } from '@/lib/require-auth-user'

export const maxDuration = 60

function timelineEventKey(event: {
  source: string
  event_date: string
  title: string
  description?: string | null
}) {
  const day = String(event.event_date).slice(0, 10)
  return `${event.source}\0${day}\0${event.title}\0${event.description || ''}`
}

export async function GET(req: Request) {
  try {
    const auth = await requireAuthUser()
    if ('error' in auth) return auth.error
    const { supabase, user } = auth

    const params = new URL(req.url).searchParams
    const claimId = params.get('claim_id')
    const projectId = params.get('project_id')
    const kind = params.get('kind')

    if (!projectId) {
      return NextResponse.json({ error: 'project_id required' }, { status: 400 })
    }

    const access = await assertAdminProjectTimelineAccess(
      supabase,
      user.id,
      projectId
    )
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status })
    }

    if (kind === 'status_updates') {
      const { data: claims } = await supabase
        .from('claims')
        .select('id, client_name')
        .eq('project_id', projectId)

      const claimIds = (claims || []).map((c) => c.id)
      if (!claimIds.length) {
        return NextResponse.json({ events: [] })
      }

      const nameByClaim = Object.fromEntries(
        (claims || []).map((c) => [c.id, c.client_name])
      )

      const { data: statusEvents } = await supabase
        .from('claim_timeline_events')
        .select('id, claim_id, event_date, title, description, source, created_at')
        .in('claim_id', claimIds)
        .eq('title', 'Status updated')
        .order('created_at', { ascending: false })

      const events = (statusEvents || []).map((e) => ({
        ...e,
        client_name: nameByClaim[e.claim_id as string] || 'Job',
      }))

      return NextResponse.json({ events })
    }

    if (!claimId) {
      return NextResponse.json(
        { error: 'claim_id required unless kind=status_updates' },
        { status: 400 }
      )
    }

    const { data: stored } = await supabase
      .from('claim_timeline_events')
      .select('id, event_date, title, description, source, created_at')
      .eq('claim_id', claimId)
      .order('created_at', { ascending: true })

    return NextResponse.json({ events: stored || [] })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Timeline failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireAuthUser()
    if ('error' in auth) return auth.error
    const { supabase, user } = auth

    const { claim_id, project_id, persist } = await req.json()

    if (!claim_id || !project_id) {
      return NextResponse.json(
        { error: 'claim_id and project_id required' },
        { status: 400 }
      )
    }

    const access = await assertAdminProjectTimelineAccess(
      supabase,
      user.id,
      project_id
    )
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status })
    }

    const { data: claim } = await supabase
      .from('claims')
      .select('*')
      .eq('id', claim_id)
      .eq('project_id', project_id)
      .maybeSingle()

    if (!claim) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
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
        { error: 'Active subscription required.' },
        { status: 403 }
      )
    }

    const evidence = await listEvidence(supabase, project_id, claim_id)
    const events = await generateClaimTimeline(claim, evidence)

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

    if (persist && events.length) {
      const { data: existing, error: loadError } = await supabase
        .from('claim_timeline_events')
        .select('event_date, title, description, source')
        .eq('claim_id', claim_id)

      if (loadError) {
        await refundAiSummary(project.organization_id)
        return NextResponse.json({ error: loadError.message }, { status: 500 })
      }

      const existingKeys = new Set(
        (existing || []).map((row) => timelineEventKey(row))
      )

      const toInsert = events.filter(
        (e) => !existingKeys.has(timelineEventKey(e))
      )

      if (!toInsert.length) {
        await refundAiSummary(project.organization_id)
      } else {
        const { error: insertError } = await supabase
          .from('claim_timeline_events')
          .insert(
            toInsert.map((e) => ({
              claim_id,
              event_date: e.event_date,
              title: e.title,
              description: e.description,
              source: e.source,
            }))
          )

        if (insertError) {
          await refundAiSummary(project.organization_id)
          return NextResponse.json({ error: insertError.message }, { status: 500 })
        }
      }
    }

    return NextResponse.json({ events })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Timeline failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

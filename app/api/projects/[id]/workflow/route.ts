import { NextResponse } from 'next/server'
import { loadUserAccessServer } from '@/lib/load-access-server'
import {
  normalizeStatusKey,
  normalizeWorkflowDraft,
  parseProjectStatusWorkflow,
  serializeProjectStatusWorkflow,
  validateStatusWorkflow,
} from '@/lib/project-status-workflow'
import { requireAuth } from '@/lib/require-auth'
import { touchProjectActivity } from '@/lib/touch-project-activity'

type RouteContext = { params: Promise<{ id: string }> }

async function loadProjectForRead(
  supabase: Awaited<ReturnType<typeof requireAuth>>['supabase'],
  projectId: string
) {
  const { data, error } = await supabase
    .from('projects')
    .select('id, organization_id, status_workflow')
    .eq('id', projectId)
    .maybeSingle()

  if (error || !data) return null
  return data
}

export async function GET(_req: Request, context: RouteContext) {
  try {
    const { id: projectId } = await context.params
    const { supabase, user } = await requireAuth()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const project = await loadProjectForRead(supabase, projectId)
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const workflow = parseProjectStatusWorkflow(project.status_workflow)
    return NextResponse.json({ workflow })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load workflow'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(req: Request, context: RouteContext) {
  try {
    const { id: projectId } = await context.params
    const { supabase, user } = await requireAuth()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { access } = await loadUserAccessServer()
    if (!access?.canManageSystemSettings) {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    }

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, organization_id')
      .eq('id', projectId)
      .maybeSingle()

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    if (project.organization_id !== access.organizationId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json().catch(() => ({}))
    const stagesRaw = body.stages ?? body.workflow?.stages
    if (!Array.isArray(stagesRaw)) {
      return NextResponse.json({ error: 'stages array is required' }, { status: 400 })
    }

    const workflow = normalizeWorkflowDraft(
      stagesRaw.map((s: { key?: string; label?: string }) => ({
        key: String(s.key || ''),
        label: String(s.label || ''),
      }))
    )

    const validation = validateStatusWorkflow(workflow)
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const { error: updateError } = await supabase
      .from('projects')
      .update({
        status_workflow: serializeProjectStatusWorkflow(workflow),
      })
      .eq('id', projectId)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    const { data: claims } = await supabase
      .from('claims')
      .select('id, status')
      .eq('project_id', projectId)

    const validKeys = new Set(workflow.map((s) => s.key))
    const fallbackKey = workflow[0].key

    for (const claim of claims || []) {
      const normalized = normalizeStatusKey(claim.status, workflow)
      if (!validKeys.has(normalized)) {
        await supabase
          .from('claims')
          .update({ status: fallbackKey, completed_at: null })
          .eq('id', claim.id)
      } else if (normalized !== claim.status) {
        await supabase
          .from('claims')
          .update({ status: normalized })
          .eq('id', claim.id)
      }
    }

    await touchProjectActivity(supabase, projectId)

    return NextResponse.json({ workflow })
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Failed to update workflow'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

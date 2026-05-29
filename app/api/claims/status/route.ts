import { NextResponse } from 'next/server'
import { loadUserAccessServer } from '@/lib/load-access-server'
import { triggerProjectCompletedBackup } from '@/lib/organization-backups'
import {
  COMPLETED_STATUS_KEY,
  isCompletedStatus,
  isStatusInWorkflow,
  normalizeStatusKey,
  parseProjectStatusWorkflow,
  statusLabel,
} from '@/lib/project-status-workflow'
import { getProjectOrgId } from '@/lib/staff-project-access'
import { requireAuth } from '@/lib/require-auth'
import { touchProjectActivity } from '@/lib/touch-project-activity'

export async function PATCH(req: Request) {
  try {
    const { supabase, user } = await requireAuth()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { access } = await loadUserAccessServer()
    if (!access?.canUpdateReportStatus) {
      const message = !access?.plan
        ? 'Active subscription required. Open Billing or complete your plan setup.'
        : access.role === 'client'
          ? 'Clients have view-only access.'
          : access.role === 'worker'
            ? 'Only organization admins can update report status.'
            : 'You do not have permission to update report status.'
      return NextResponse.json({ error: message }, { status: 403 })
    }

    const body = await req.json().catch(() => ({}))
    const claimId = String(body.claim_id || '').trim()
    const projectId = String(body.project_id || '').trim()
    const rawStatus = String(body.status || '').trim()

    if (!claimId || !projectId) {
      return NextResponse.json(
        { error: 'claim_id and project_id are required' },
        { status: 400 }
      )
    }

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('status_workflow')
      .eq('id', projectId)
      .maybeSingle()

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const workflow = parseProjectStatusWorkflow(project.status_workflow)

    if (!isStatusInWorkflow(rawStatus, workflow)) {
      return NextResponse.json({ error: 'Invalid report status' }, { status: 400 })
    }

    const nextKey = normalizeStatusKey(rawStatus, workflow)

    const { data: claim, error: fetchError } = await supabase
      .from('claims')
      .select('id, project_id, status')
      .eq('id', claimId)
      .eq('project_id', projectId)
      .maybeSingle()

    if (fetchError || !claim) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    const previousKey = normalizeStatusKey(claim.status, workflow)

    const claimPatch: { status: string; completed_at?: string | null } = {
      status: nextKey,
    }
    if (
      isCompletedStatus(nextKey, workflow) &&
      !isCompletedStatus(previousKey, workflow)
    ) {
      claimPatch.completed_at = new Date().toISOString()
    } else if (!isCompletedStatus(nextKey, workflow)) {
      claimPatch.completed_at = null
    }

    const { data: updated, error: updateError } = await supabase
      .from('claims')
      .update(claimPatch)
      .eq('id', claimId)
      .select('id, status, client_name, property_address')
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    if (previousKey !== nextKey) {
      const fromLabel = statusLabel(previousKey, workflow)
      const toLabel = statusLabel(nextKey, workflow)
      await supabase.from('claim_timeline_events').insert({
        claim_id: claimId,
        title: 'Status updated',
        description: `${fromLabel} → ${toLabel}`,
        event_date: new Date().toISOString().slice(0, 10),
        source: 'manual',
      })
    }

    await touchProjectActivity(supabase, projectId)

    if (
      isCompletedStatus(nextKey, workflow) &&
      !isCompletedStatus(previousKey, workflow)
    ) {
      const organizationId = await getProjectOrgId(supabase, projectId)
      if (organizationId) {
        void triggerProjectCompletedBackup(organizationId, projectId).catch(
          () => {}
        )
      }
    }

    return NextResponse.json({ claim: updated })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Update failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

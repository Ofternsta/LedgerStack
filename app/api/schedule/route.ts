import { NextResponse } from 'next/server'
import { requireOrgPlanFeature } from '@/lib/plan-guard'
import {
  canAccessStaffProjectFeatures,
  getProjectOrgId,
} from '@/lib/staff-project-access'
import { isScheduleEventType } from '@/lib/schedule-types'
import { assertProjectMemberPermission } from '@/lib/member-permissions-server'
import { requireAuth } from '@/lib/require-auth'

export async function GET(req: Request) {
  try {
    const { supabase, user } = await requireAuth()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const params = new URL(req.url).searchParams
    const projectId = params.get('project_id')
    const claimId = params.get('claim_id')
    const orgCalendar = params.get('org') === '1'
    const from = params.get('from')
    const to = params.get('to')

    if (orgCalendar) {
      const { data: org } = await supabase
        .from('organizations')
        .select('id')
        .eq('admin_user_id', user.id)
        .maybeSingle()

      let organizationId = org?.id

      if (!organizationId) {
        const { data: membership } = await supabase
          .from('organization_members')
          .select('organization_id')
          .eq('user_id', user.id)
          .eq('status', 'approved')
          .limit(1)
          .maybeSingle()
        organizationId = membership?.organization_id
      }

      if (!organizationId) {
        return NextResponse.json({ error: 'No organization' }, { status: 403 })
      }

      const scheduleRead = await requireOrgPlanFeature(
        supabase,
        organizationId,
        'scheduling',
        'Scheduling & calendar'
      )
      if (!scheduleRead.ok) {
        return NextResponse.json({ error: scheduleRead.error }, { status: 403 })
      }

      let query = supabase
        .from('schedule_events')
        .select('*')
        .eq('organization_id', organizationId)
        .order('starts_at', { ascending: true })

      if (from) query = query.gte('starts_at', from)
      if (to) query = query.lte('starts_at', to)

      const { data, error } = await query
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      return NextResponse.json({ events: data || [] })
    }

    if (!projectId) {
      return NextResponse.json(
        { error: 'project_id or org=1 required' },
        { status: 400 }
      )
    }

    if (!(await canAccessStaffProjectFeatures(supabase, projectId, user.id))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const projectOrgId = await getProjectOrgId(supabase, projectId)
    if (projectOrgId) {
      const scheduleProject = await requireOrgPlanFeature(
        supabase,
        projectOrgId,
        'scheduling',
        'Scheduling & calendar'
      )
      if (!scheduleProject.ok) {
        return NextResponse.json({ error: scheduleProject.error }, { status: 403 })
      }
    }

    let query = supabase
      .from('schedule_events')
      .select('*')
      .eq('project_id', projectId)
      .order('starts_at', { ascending: true })

    if (claimId) query = query.eq('claim_id', claimId)

    const { data, error } = await query
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ events: data || [] })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load schedule'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { supabase, user } = await requireAuth()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const projectId = String(body.project_id || '')
    const eventType = String(body.event_type || '')
    const title = String(body.title || '').trim()
    const startsAt = String(body.starts_at || '')

    if (!projectId || !title || !startsAt) {
      return NextResponse.json(
        { error: 'project_id, title, and starts_at are required' },
        { status: 400 }
      )
    }

    if (!isScheduleEventType(eventType)) {
      return NextResponse.json({ error: 'Invalid event_type' }, { status: 400 })
    }

    if (!(await canAccessStaffProjectFeatures(supabase, projectId, user.id))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const organizationId = await getProjectOrgId(supabase, projectId)
    if (!organizationId) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const scheduleWrite = await requireOrgPlanFeature(
      supabase,
      organizationId,
      'scheduling',
      'Scheduling & calendar'
    )
    if (!scheduleWrite.ok) {
      return NextResponse.json({ error: scheduleWrite.error }, { status: 403 })
    }

    const eventGate = await assertProjectMemberPermission(
      supabase,
      user.id,
      projectId,
      'can_add_events'
    )
    if (!eventGate.ok) {
      return NextResponse.json(
        { error: eventGate.error },
        { status: eventGate.status }
      )
    }

    const { data, error } = await supabase
      .from('schedule_events')
      .insert({
        organization_id: organizationId,
        project_id: projectId,
        claim_id: body.claim_id || null,
        event_type: eventType,
        title,
        description: body.description?.trim() || null,
        starts_at: startsAt,
        ends_at: body.ends_at || null,
        assigned_user_id: body.assigned_user_id || null,
        reminder_at: body.reminder_at || null,
        created_by: user.id,
      })
      .select('*')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ event: data })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create event'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const { supabase, user } = await requireAuth()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const id = String(body.id || '')
    const projectId = String(body.project_id || '')

    if (!id || !projectId) {
      return NextResponse.json(
        { error: 'id and project_id are required' },
        { status: 400 }
      )
    }

    if (!(await canAccessStaffProjectFeatures(supabase, projectId, user.id))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const eventGate = await assertProjectMemberPermission(
      supabase,
      user.id,
      projectId,
      'can_add_events'
    )
    if (!eventGate.ok) {
      return NextResponse.json(
        { error: eventGate.error },
        { status: eventGate.status }
      )
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (body.title !== undefined) updates.title = String(body.title).trim()
    if (body.description !== undefined) {
      updates.description = body.description?.trim() || null
    }
    if (body.starts_at !== undefined) updates.starts_at = body.starts_at
    if (body.ends_at !== undefined) updates.ends_at = body.ends_at || null
    if (body.assigned_user_id !== undefined) {
      updates.assigned_user_id = body.assigned_user_id || null
    }
    if (body.reminder_at !== undefined) {
      updates.reminder_at = body.reminder_at || null
    }
    if (body.completed_at !== undefined) {
      updates.completed_at = body.completed_at || null
    }
    if (body.event_type !== undefined) {
      if (!isScheduleEventType(String(body.event_type))) {
        return NextResponse.json({ error: 'Invalid event_type' }, { status: 400 })
      }
      updates.event_type = body.event_type
    }

    const { data, error } = await supabase
      .from('schedule_events')
      .update(updates)
      .eq('id', id)
      .eq('project_id', projectId)
      .select('*')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ event: data })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update event'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const { supabase, user } = await requireAuth()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const params = new URL(req.url).searchParams
    const id = params.get('id')
    const projectId = params.get('project_id')

    if (!id || !projectId) {
      return NextResponse.json(
        { error: 'id and project_id are required' },
        { status: 400 }
      )
    }

    if (!(await canAccessStaffProjectFeatures(supabase, projectId, user.id))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const eventGate = await assertProjectMemberPermission(
      supabase,
      user.id,
      projectId,
      'can_add_events'
    )
    if (!eventGate.ok) {
      return NextResponse.json(
        { error: eventGate.error },
        { status: eventGate.status }
      )
    }

    const { error } = await supabase
      .from('schedule_events')
      .delete()
      .eq('id', id)
      .eq('project_id', projectId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to delete event'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

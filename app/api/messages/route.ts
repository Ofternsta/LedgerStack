import { NextResponse } from 'next/server'
import {
  canAccessOrgTeamMessages,
  canAccessProjectMessages,
  canSendOrgTeamMessages,
  canSendProjectMessages,
  type MessageChannel,
} from '@/lib/message-access'
import { requireAuth } from '@/lib/require-auth'

export async function GET(req: Request) {
  try {
    const { supabase, user } = await requireAuth()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const params = new URL(req.url).searchParams
    const channel = params.get('channel') as MessageChannel | null
    const projectId = params.get('project_id')

    if (channel !== 'org_team' && channel !== 'project') {
      return NextResponse.json({ error: 'Invalid channel' }, { status: 400 })
    }

    if (channel === 'project' && !projectId) {
      return NextResponse.json(
        { error: 'project_id is required for project messages' },
        { status: 400 }
      )
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    const role = profile?.role || 'client'

    if (channel === 'org_team') {
      const { data: org } = await supabase
        .from('organizations')
        .select('id')
        .eq('admin_user_id', user.id)
        .maybeSingle()

      let organizationId = org?.id

      if (!organizationId && role === 'worker') {
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

      const allowed = await canAccessOrgTeamMessages(
        supabase,
        user.id,
        organizationId
      )
      if (!allowed) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      const { data: rows, error } = await supabase
        .from('messages')
        .select('id, sender_id, body, created_at')
        .eq('organization_id', organizationId)
        .eq('channel', 'org_team')
        .order('created_at', { ascending: true })
        .limit(200)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      const messages = await enrichSenders(supabase, rows || [])
      return NextResponse.json({ messages })
    }

    const allowed = await canAccessProjectMessages(
      supabase,
      projectId!,
      user.id
    )
    if (!allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: rows, error } = await supabase
      .from('messages')
      .select('id, sender_id, body, created_at')
      .eq('project_id', projectId)
      .eq('channel', 'project')
      .order('created_at', { ascending: true })
      .limit(200)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

      const messages = await enrichSenders(supabase, rows || [])
      return NextResponse.json({ messages })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load messages'
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
    const channel = body.channel as MessageChannel
    const text = (body.body as string)?.trim()
    const projectId = body.project_id as string | undefined

    if (!text) {
      return NextResponse.json({ error: 'Message body is required' }, { status: 400 })
    }

    if (channel !== 'org_team' && channel !== 'project') {
      return NextResponse.json({ error: 'Invalid channel' }, { status: 400 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    const role = profile?.role || 'client'

    const { data: membership } = await supabase
      .from('organization_members')
      .select('status')
      .eq('user_id', user.id)
      .maybeSingle()

    const workerStatus =
      membership?.status === 'approved'
        ? 'approved'
        : membership
          ? 'pending'
          : 'none'

    if (channel === 'org_team') {
      if (!canSendOrgTeamMessages(role, workerStatus)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      const { data: org } = await supabase
        .from('organizations')
        .select('id')
        .eq('admin_user_id', user.id)
        .maybeSingle()

      let organizationId = org?.id

      if (!organizationId && role === 'worker') {
        const { data: m } = await supabase
          .from('organization_members')
          .select('organization_id')
          .eq('user_id', user.id)
          .eq('status', 'approved')
          .limit(1)
          .maybeSingle()
        organizationId = m?.organization_id
      }

      if (!organizationId) {
        return NextResponse.json({ error: 'No organization' }, { status: 403 })
      }

      const { data: row, error } = await supabase
        .from('messages')
        .insert({
          organization_id: organizationId,
          project_id: null,
          channel: 'org_team',
          sender_id: user.id,
          body: text,
        })
        .select('id, sender_id, body, created_at')
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      const [enriched] = await enrichSenders(supabase, [row])
      return NextResponse.json({ message: enriched })
    }

    if (!projectId) {
      return NextResponse.json(
        { error: 'project_id is required' },
        { status: 400 }
      )
    }

    if (!canSendProjectMessages(role, workerStatus)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const canRead = await canAccessProjectMessages(supabase, projectId, user.id)
    if (!canRead) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: project } = await supabase
      .from('projects')
      .select('organization_id')
      .eq('id', projectId)
      .maybeSingle()

    if (!project?.organization_id) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const { data: row, error } = await supabase
      .from('messages')
      .insert({
        organization_id: project.organization_id,
        project_id: projectId,
        channel: 'project',
        sender_id: user.id,
        body: text,
      })
      .select('id, sender_id, body, created_at')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const [enriched] = await enrichSenders(supabase, [row])
    return NextResponse.json({ message: enriched })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to send message'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

async function enrichSenders(
  supabase: Awaited<ReturnType<typeof requireAuth>>['supabase'],
  rows: Array<{
    id: string
    sender_id: string
    body: string
    created_at: string
  }>
) {
  const ids = [...new Set(rows.map((r) => r.sender_id))]
  let names: Record<string, { full_name: string | null; role: string }> = {}

  if (ids.length) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .in('id', ids)

    names = Object.fromEntries(
      (profiles || []).map((p) => [
        p.id,
        { full_name: p.full_name, role: p.role },
      ])
    )
  }

  return rows.map((r) => {
    const sender = names[r.sender_id]
    const roleLabel =
      sender?.role === 'admin'
        ? 'Admin'
        : sender?.role === 'worker'
          ? 'Worker'
          : sender?.role === 'client'
            ? 'Client'
            : 'User'

    return {
      id: r.id,
      sender_id: r.sender_id,
      body: r.body,
      created_at: r.created_at,
      sender_name: sender?.full_name || roleLabel,
      sender_role: sender?.role || 'unknown',
      sender_label: `${sender?.full_name || roleLabel} (${roleLabel})`,
    }
  })
}

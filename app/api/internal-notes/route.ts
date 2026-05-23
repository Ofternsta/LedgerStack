import { NextResponse } from 'next/server'
import { extractMentionedUserIds } from '@/lib/mentions'
import { requireOrgPlanFeature } from '@/lib/plan-guard'
import {
  canAccessStaffProjectFeatures,
  getProjectOrgId,
} from '@/lib/staff-project-access'
import { loadTeamRoster } from '@/lib/team-roster'
import { requireAuth } from '@/lib/require-auth'

const NOTE_KINDS = new Set(['note', 'status_update', 'mention'])

async function enrichNotes(
  supabase: Awaited<ReturnType<typeof requireAuth>>['supabase'],
  rows: Array<{
    id: string
    author_id: string
    body: string
    mentioned_user_ids: string[]
    note_kind: string
    claim_id: string | null
    created_at: string
  }>
) {
  const ids = [
    ...new Set([
      ...rows.map((r) => r.author_id),
      ...rows.flatMap((r) => r.mentioned_user_ids || []),
    ]),
  ]

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
    const author = names[r.author_id]
    const authorLabel = author?.full_name?.trim() || author?.role || 'User'
    return {
      ...r,
      author_name: authorLabel,
      author_role: author?.role || 'unknown',
      mentioned_users: (r.mentioned_user_ids || []).map((id) => ({
        id,
        name: names[id]?.full_name?.trim() || names[id]?.role || 'User',
      })),
    }
  })
}

export async function GET(req: Request) {
  try {
    const { supabase, user } = await requireAuth()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const params = new URL(req.url).searchParams
    const projectId = params.get('project_id')
    const claimId = params.get('claim_id')

    if (!projectId) {
      return NextResponse.json({ error: 'project_id is required' }, { status: 400 })
    }

    if (!(await canAccessStaffProjectFeatures(supabase, projectId, user.id))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const orgId = await getProjectOrgId(supabase, projectId)
    if (!orgId) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const notesRead = await requireOrgPlanFeature(
      supabase,
      orgId,
      'internalNotes',
      'Internal notes'
    )
    if (!notesRead.ok) {
      return NextResponse.json({ error: notesRead.error }, { status: 403 })
    }

    let query = supabase
      .from('internal_notes')
      .select('id, author_id, body, mentioned_user_ids, note_kind, claim_id, created_at')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(200)

    if (claimId) query = query.eq('claim_id', claimId)

    const { data, error } = await query
    if (error) {
      if (error.message.includes('relation') && error.message.includes('internal_notes')) {
        return NextResponse.json(
          {
            error:
              'Internal notes table missing. Run supabase/scheduling-and-notes.sql in Supabase.',
          },
          { status: 503 }
        )
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const notes = await enrichNotes(supabase, data || [])
    return NextResponse.json({ notes })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load notes'
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
    const text = String(body.body || '').trim()
    const noteKind = String(body.note_kind || 'note')

    if (!projectId || !text) {
      return NextResponse.json(
        { error: 'project_id and body are required' },
        { status: 400 }
      )
    }

    if (!NOTE_KINDS.has(noteKind)) {
      return NextResponse.json({ error: 'Invalid note_kind' }, { status: 400 })
    }

    if (!(await canAccessStaffProjectFeatures(supabase, projectId, user.id))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const organizationId = await getProjectOrgId(supabase, projectId)
    if (!organizationId) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const notesWrite = await requireOrgPlanFeature(
      supabase,
      organizationId,
      'internalNotes',
      'Internal notes'
    )
    if (!notesWrite.ok) {
      return NextResponse.json({ error: notesWrite.error }, { status: 403 })
    }

    const roster = await loadTeamRoster(supabase, organizationId)
    const rosterIds = new Set(roster.map((m) => m.id))
    const mentioned = extractMentionedUserIds(text).filter((id) =>
      rosterIds.has(id)
    )

    const kind =
      mentioned.length > 0 && noteKind === 'note' ? 'mention' : noteKind

    const { data, error } = await supabase
      .from('internal_notes')
      .insert({
        organization_id: organizationId,
        project_id: projectId,
        claim_id: body.claim_id || null,
        author_id: user.id,
        body: text,
        mentioned_user_ids: mentioned,
        note_kind: kind,
      })
      .select('id, author_id, body, mentioned_user_ids, note_kind, claim_id, created_at')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (kind === 'status_update' && body.claim_id) {
      await supabase.from('claim_timeline_events').insert({
        claim_id: body.claim_id,
        title: 'Team update',
        description: text.slice(0, 500),
        event_date: new Date().toISOString(),
        source: 'manual',
      })
    }

    const [note] = await enrichNotes(supabase, [data])
    return NextResponse.json({ note })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to add note'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

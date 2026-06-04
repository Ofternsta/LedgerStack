import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import { listEvidence } from '@/lib/evidence-storage'
import { enrichMessageSenders } from '@/lib/message-sender-labels'
import { SCHEDULE_EVENT_LABELS, isScheduleEventType } from '@/lib/schedule-types'

const MAX_DOC_EXCERPT = 1800
const MAX_DOCS = 80
const MAX_MESSAGES = 80
const MAX_NOTES = 60
const MAX_TIMELINE = 80

export type ProjectChatDocument = {
  doc_ref: string
  claim_id: string
  job_name: string
  evidence_type: string
  file_name: string
  summary: string
  extracted_excerpt: string
  created_at: string
}

export type ProjectChatContext = {
  project: Record<string, unknown>
  claims: Array<Record<string, unknown>>
  documents: ProjectChatDocument[]
  timelineEvents: Array<{
    claim_id: string
    job_name: string
    title: string
    description: string
    event_date: string
    created_at?: string
  }>
  internalNotes: Array<{
    author_name: string
    body: string
    note_kind: string
    claim_id: string | null
    created_at: string
  }>
  projectMessages: Array<{
    sender_label: string
    body: string
    created_at: string
  }>
  scheduleEvents: Array<Record<string, unknown>>
}

function formatWhen(iso: string | null | undefined) {
  if (!iso) return '—'
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return iso
  return new Date(t).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function truncateText(text: string, max: number) {
  const t = text.replace(/\s+/g, ' ').trim()
  if (t.length <= max) return t
  return `${t.slice(0, max)}…`
}

async function enrichNoteAuthors(
  supabase: SupabaseClient,
  rows: Array<{
    author_id: string
    body: string
    note_kind: string
    claim_id: string | null
    created_at: string
  }>
) {
  const ids = [...new Set(rows.map((r) => r.author_id))]
  let names: Record<string, string> = {}
  if (ids.length) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .in('id', ids)
    names = Object.fromEntries(
      (profiles || []).map((p) => [
        p.id,
        p.full_name?.trim() || p.role || 'User',
      ])
    )
  }
  return rows.map((r) => ({
    author_name: names[r.author_id] || 'User',
    body: r.body,
    note_kind: r.note_kind,
    claim_id: r.claim_id,
    created_at: r.created_at,
  }))
}

export async function gatherProjectChatContext(
  supabase: SupabaseClient,
  projectId: string,
  options?: {
    allowedDocRefs?: Set<string> | null
  }
): Promise<ProjectChatContext | null> {
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .maybeSingle()

  if (projectError || !project) return null

  const { data: claimRows } = await supabase
    .from('claims')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true })

  const claims = claimRows || []
  const nameByClaim = Object.fromEntries(
    claims.map((c) => [c.id, String(c.client_name || 'Job')])
  )
  const claimIds = claims.map((c) => c.id)

  let timelineEvents: ProjectChatContext['timelineEvents'] = []
  if (claimIds.length) {
    const { data: stored } = await supabase
      .from('claim_timeline_events')
      .select('claim_id, event_date, title, description, created_at')
      .in('claim_id', claimIds)
      .order('created_at', { ascending: true })
      .limit(300)

    timelineEvents = (stored || []).map((e) => ({
      claim_id: e.claim_id as string,
      job_name: nameByClaim[e.claim_id as string] || 'Job',
      title: String(e.title || ''),
      description: String(e.description || ''),
      event_date: String(e.event_date || ''),
      created_at: e.created_at as string | undefined,
    }))
  }

  const { data: noteRows } = await supabase
    .from('internal_notes')
    .select('author_id, body, note_kind, claim_id, created_at')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true })
    .limit(200)

  const internalNotes = await enrichNoteAuthors(supabase, noteRows || [])

  const { data: messageRows } = await supabase
    .from('messages')
    .select('id, sender_id, body, created_at')
    .eq('project_id', projectId)
    .eq('channel', 'project')
    .order('created_at', { ascending: true })
    .limit(200)

  const orgId = String(project.organization_id || '')
  const enrichedMessages = orgId
    ? await enrichMessageSenders(orgId, messageRows || [])
    : []

  const { data: scheduleRows } = await supabase
    .from('schedule_events')
    .select('*')
    .eq('project_id', projectId)
    .order('starts_at', { ascending: true })
    .limit(200)

  const documents: ProjectChatDocument[] = []
  for (const c of claims) {
    const files = await listEvidence(supabase, projectId, c.id)
    for (const e of files) {
      if (
        options?.allowedDocRefs &&
        !options.allowedDocRefs.has(e.file_path)
      ) {
        continue
      }
      const excerptSource = e.extracted_text?.trim() || e.summary || ''
      documents.push({
        doc_ref: e.file_path,
        claim_id: c.id,
        job_name: nameByClaim[c.id] || 'Job',
        evidence_type: e.evidence_type,
        file_name: e.file_name,
        summary: e.summary || '',
        extracted_excerpt: truncateText(excerptSource, MAX_DOC_EXCERPT),
        created_at: e.created_at,
      })
    }
  }

  documents.sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  return {
    project: project as Record<string, unknown>,
    claims: claims as Array<Record<string, unknown>>,
    documents: documents.slice(0, MAX_DOCS),
    timelineEvents: timelineEvents.slice(-MAX_TIMELINE),
    internalNotes: internalNotes.slice(-MAX_NOTES),
    projectMessages: enrichedMessages.slice(-MAX_MESSAGES).map((m) => ({
      sender_label: m.sender_label,
      body: m.body,
      created_at: m.created_at,
    })),
    scheduleEvents: (scheduleRows || []) as Array<Record<string, unknown>>,
  }
}

export function formatProjectChatPrompt(ctx: ProjectChatContext): string {
  const lines: string[] = [
    '=== PROJECT (answer ONLY about this project) ===',
    `Project ID: ${ctx.project.id}`,
    `Customer: ${ctx.project.customer_name}`,
    `Address: ${ctx.project.project_address}`,
    `Description: ${ctx.project.notes || '(none)'}`,
    `Created: ${formatWhen(String(ctx.project.created_at || ''))}`,
    '',
    '=== JOBS ===',
  ]

  if (!ctx.claims.length) {
    lines.push('(no jobs)')
  } else {
    for (const c of ctx.claims) {
      lines.push(
        `- job_id=${c.id} | ${c.client_name} | status=${c.status} | #${c.claim_number} | ${c.property_address}`
      )
    }
  }

  lines.push('', '=== DOCUMENT CATALOG (cite doc_ref exactly) ===')
  if (!ctx.documents.length) {
    lines.push('(no documents)')
  } else {
    for (const d of ctx.documents) {
      lines.push(
        `doc_ref=${d.doc_ref} | job_id=${d.claim_id} | job=${d.job_name} | type=${d.evidence_type} | file=${d.file_name} | uploaded=${formatWhen(d.created_at)}`
      )
      if (d.summary) lines.push(`  summary: ${d.summary}`)
      if (d.extracted_excerpt) {
        lines.push(`  text: ${d.extracted_excerpt}`)
      }
    }
  }

  lines.push('', '=== TIMELINE ===')
  if (!ctx.timelineEvents.length) lines.push('(none)')
  else {
    for (const e of ctx.timelineEvents) {
      lines.push(
        `[${formatWhen(e.created_at || e.event_date)}] (${e.job_name}) ${e.title}: ${e.description}`
      )
    }
  }

  lines.push('', '=== INTERNAL NOTES (staff) ===')
  if (!ctx.internalNotes.length) lines.push('(none)')
  else {
    for (const n of ctx.internalNotes) {
      lines.push(
        `[${formatWhen(n.created_at)}] ${n.author_name} (${n.note_kind}): ${n.body}`
      )
    }
  }

  lines.push('', '=== PROJECT MESSAGES ===')
  if (!ctx.projectMessages.length) lines.push('(none)')
  else {
    for (const m of ctx.projectMessages) {
      lines.push(`[${formatWhen(m.created_at)}] ${m.sender_label}: ${m.body}`)
    }
  }

  lines.push('', '=== CALENDAR EVENTS ===')
  if (!ctx.scheduleEvents.length) lines.push('(none)')
  else {
    for (const ev of ctx.scheduleEvents) {
      const type = String(ev.event_type || 'other')
      const label = isScheduleEventType(type)
        ? SCHEDULE_EVENT_LABELS[type]
        : type
      lines.push(
        `[${formatWhen(String(ev.starts_at || ''))}] ${label} — ${ev.title || ''}: ${ev.description || ''}`
      )
    }
  }

  return lines.join('\n')
}

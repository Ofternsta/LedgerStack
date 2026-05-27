import { NextResponse } from 'next/server'
import {
  canUseOrgMessaging,
  isConversationParticipant,
  resolveMessagingOrganizationId,
} from '@/lib/conversation-access'
import { enrichConversationMessages } from '@/lib/conversations-server'
import { requireOrgPlanFeature } from '@/lib/plan-guard'
import { requireAuth } from '@/lib/require-auth'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_req: Request, context: RouteContext) {
  try {
    const { id: conversationId } = await context.params
    const { supabase, user } = await requireAuth()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const organizationId = await resolveMessagingOrganizationId(supabase, user.id)
    if (!organizationId) {
      return NextResponse.json({ error: 'No organization' }, { status: 403 })
    }

    const allowed = await canUseOrgMessaging(supabase, user.id, organizationId)
    if (!allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const participant = await isConversationParticipant(
      supabase,
      conversationId,
      user.id
    )
    if (!participant) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: rows, error } = await supabase
      .from('conversation_messages')
      .select('id, sender_id, body, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(200)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const messages = await enrichConversationMessages(organizationId, rows || [])
    return NextResponse.json({ messages })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load messages'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: Request, context: RouteContext) {
  try {
    const { id: conversationId } = await context.params
    const { supabase, user } = await requireAuth()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const text = String(body.body || '').trim()
    if (!text) {
      return NextResponse.json({ error: 'Message body is required' }, { status: 400 })
    }

    const organizationId = await resolveMessagingOrganizationId(supabase, user.id)
    if (!organizationId) {
      return NextResponse.json({ error: 'No organization' }, { status: 403 })
    }

    const allowed = await canUseOrgMessaging(supabase, user.id, organizationId)
    if (!allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const teamCheck = await requireOrgPlanFeature(
      supabase,
      organizationId,
      'teamMessages',
      'Team messages'
    )
    if (!teamCheck.ok) {
      return NextResponse.json({ error: teamCheck.error }, { status: 403 })
    }

    const participant = await isConversationParticipant(
      supabase,
      conversationId,
      user.id
    )
    if (!participant) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: row, error } = await supabase
      .from('conversation_messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        body: text,
      })
      .select('id, sender_id, body, created_at')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const [message] = await enrichConversationMessages(organizationId, [row])
    return NextResponse.json({ message })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to send message'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

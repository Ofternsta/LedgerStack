import { NextResponse } from 'next/server'
import {
  canUseOrgMessaging,
  resolveMessagingOrganizationId,
} from '@/lib/conversation-access'
import {
  createConversation,
  createConversationService,
  listConversationsForUser,
} from '@/lib/conversations-server'
import { requireOrgPlanFeature } from '@/lib/plan-guard'
import { requireAuth } from '@/lib/require-auth'

export async function GET() {
  try {
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

    const teamCheck = await requireOrgPlanFeature(
      supabase,
      organizationId,
      'teamMessages',
      'Team messages'
    )
    if (!teamCheck.ok) {
      return NextResponse.json({ error: teamCheck.error }, { status: 403 })
    }

    const conversations = await listConversationsForUser(
      supabase,
      organizationId,
      user.id
    )

    return NextResponse.json({ conversations })
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Failed to load conversations'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { supabase, user } = await requireAuth()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const participantIds = Array.isArray(body.participant_ids)
      ? (body.participant_ids as string[])
      : []
    const title = String(body.title || '').trim()

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

    const service = createConversationService()
    const result = await createConversation(
      service,
      organizationId,
      user.id,
      participantIds,
      { title }
    )

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ conversation_id: result.conversationId })
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Failed to create conversation'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

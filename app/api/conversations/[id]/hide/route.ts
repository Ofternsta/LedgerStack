import { NextResponse } from 'next/server'
import {
  canUseOrgMessaging,
  isConversationParticipant,
  resolveMessagingOrganizationId,
} from '@/lib/conversation-access'
import { hideConversationForUser } from '@/lib/conversations-server'
import { requireAuth } from '@/lib/require-auth'

type RouteContext = { params: Promise<{ id: string }> }

/** POST hide this chat from the current user's list only. */
export async function POST(_req: Request, context: RouteContext) {
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

    await hideConversationForUser(supabase, conversationId, user.id)
    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Failed to hide conversation'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

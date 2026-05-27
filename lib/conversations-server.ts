import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  ConversationListItem,
  ConversationMessage,
} from '@/lib/conversation-types'
import { enrichMessageSenders } from '@/lib/message-sender-labels'
import { loadTeamRoster, type TeamRosterMember } from '@/lib/team-roster'
import { createServiceClient } from '@/lib/supabase/service'

export type { ConversationListItem, ConversationMessage }

function directTitle(
  roster: TeamRosterMember[],
  userId: string,
  participantIds: string[]
): string {
  const otherId = participantIds.find((id) => id !== userId)
  const other = roster.find((m) => m.id === otherId)
  return other?.display_label || other?.label || 'Direct message'
}

export async function listConversationsForUser(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string
): Promise<ConversationListItem[]> {
  const { data: memberships, error } = await supabase
    .from('conversation_participants')
    .select('conversation_id')
    .eq('user_id', userId)

  if (error || !memberships?.length) return []

  const conversationIds = memberships.map((m) => m.conversation_id)

  const { data: conversations } = await supabase
    .from('conversations')
    .select('id, conversation_type, title, last_message_at')
    .eq('organization_id', organizationId)
    .in('id', conversationIds)
    .order('last_message_at', { ascending: false })

  if (!conversations?.length) return []

  const roster = await loadTeamRoster(supabase, organizationId)

  const { data: allParticipants } = await supabase
    .from('conversation_participants')
    .select('conversation_id, user_id')
    .in('conversation_id', conversations.map((c) => c.id))

  const participantsByConv: Record<string, string[]> = {}
  for (const row of allParticipants || []) {
    participantsByConv[row.conversation_id] =
      participantsByConv[row.conversation_id] || []
    participantsByConv[row.conversation_id].push(row.user_id)
  }

  const { data: latestMessages } = await supabase
    .from('conversation_messages')
    .select('conversation_id, body, created_at')
    .in('conversation_id', conversations.map((c) => c.id))
    .order('created_at', { ascending: false })

  const previewByConv: Record<string, string> = {}
  for (const msg of latestMessages || []) {
    if (!previewByConv[msg.conversation_id]) {
      previewByConv[msg.conversation_id] = msg.body
    }
  }

  return conversations.map((c) => {
    const participantIds = participantsByConv[c.id] || []
    const title =
      c.conversation_type === 'group' && c.title?.trim()
        ? c.title.trim()
        : directTitle(roster, userId, participantIds)

    return {
      id: c.id,
      conversation_type: c.conversation_type as 'direct' | 'group',
      title,
      last_message_at: c.last_message_at,
      participant_ids: participantIds,
      last_message_preview: previewByConv[c.id] ?? null,
    }
  })
}

async function findExistingDirectConversation(
  service: SupabaseClient,
  organizationId: string,
  userId: string,
  otherUserId: string
): Promise<string | null> {
  const { data: myConvs } = await service
    .from('conversation_participants')
    .select('conversation_id')
    .eq('user_id', userId)

  const ids = (myConvs || []).map((r) => r.conversation_id)
  if (!ids.length) return null

  const { data: candidates } = await service
    .from('conversations')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('conversation_type', 'direct')
    .in('id', ids)

  for (const conv of candidates || []) {
    const { data: parts } = await service
      .from('conversation_participants')
      .select('user_id')
      .eq('conversation_id', conv.id)

    const userIds = (parts || []).map((p) => p.user_id).sort()
    const expected = [userId, otherUserId].sort()
    if (
      userIds.length === 2 &&
      userIds[0] === expected[0] &&
      userIds[1] === expected[1]
    ) {
      return conv.id
    }
  }

  return null
}

export async function createConversation(
  service: SupabaseClient,
  organizationId: string,
  creatorId: string,
  participantIds: string[],
  options: { title?: string; type?: 'direct' | 'group' }
): Promise<{ conversationId?: string; error?: string }> {
  const roster = await loadTeamRoster(service, organizationId)
  const rosterIds = new Set(roster.map((m) => m.id))

  const unique = [...new Set(participantIds.filter(Boolean))]
  if (!unique.includes(creatorId)) {
    unique.push(creatorId)
  }

  const invalid = unique.filter((id) => !rosterIds.has(id))
  if (invalid.length) {
    return { error: 'One or more people are not on your team.' }
  }

  if (unique.length < 2) {
    return { error: 'Select at least one other person.' }
  }

  const isDirect = unique.length === 2
  const conversationType = isDirect ? 'direct' : 'group'

  if (!isDirect && !(options.title || '').trim()) {
    return { error: 'Group chats need a name.' }
  }

  if (isDirect) {
    const otherId = unique.find((id) => id !== creatorId)!
    const existing = await findExistingDirectConversation(
      service,
      organizationId,
      creatorId,
      otherId
    )
    if (existing) return { conversationId: existing }
  }

  const { data: conv, error: convError } = await service
    .from('conversations')
    .insert({
      organization_id: organizationId,
      conversation_type: conversationType,
      title: isDirect ? null : options.title?.trim() || null,
      created_by: creatorId,
    })
    .select('id')
    .single()

  if (convError || !conv) {
    return { error: convError?.message || 'Could not create conversation' }
  }

  const rows = unique.map((user_id) => ({
    conversation_id: conv.id,
    user_id,
  }))

  const { error: partError } = await service
    .from('conversation_participants')
    .insert(rows)

  if (partError) {
    await service.from('conversations').delete().eq('id', conv.id)
    return { error: partError.message }
  }

  return { conversationId: conv.id }
}

export async function enrichConversationMessages(
  organizationId: string,
  rows: Array<{
    id: string
    sender_id: string
    body: string
    created_at: string
  }>
): Promise<ConversationMessage[]> {
  return enrichMessageSenders(organizationId, rows)
}

export function createConversationService() {
  return createServiceClient()
}

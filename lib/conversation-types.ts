export type ConversationListItem = {
  id: string
  conversation_type: 'direct' | 'group'
  title: string
  last_message_at: string
  participant_ids: string[]
  last_message_preview: string | null
  unread_count: number
}

export type ConversationUnreadSummary = {
  total_unread_messages: number
  unread_conversation_count: number
}

export type ConversationMessage = {
  id: string
  sender_id: string
  body: string
  created_at: string
  sender_name: string
  sender_role: string
  sender_label: string
}

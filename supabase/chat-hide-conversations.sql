-- Per-user hide chat from list (others still see the thread). Run after chat-unread.sql.

ALTER TABLE public.conversation_participants
  ADD COLUMN IF NOT EXISTS list_hidden_at timestamptz;

COMMENT ON COLUMN public.conversation_participants.list_hidden_at IS
  'When set, this participant hides the chat until a newer message arrives (last_message_at > list_hidden_at).';

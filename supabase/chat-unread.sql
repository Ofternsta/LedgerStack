-- Unread state for direct/group chats. Run after chat-conversations.sql.

ALTER TABLE public.conversation_participants
  ADD COLUMN IF NOT EXISTS last_read_at timestamptz;

COMMENT ON COLUMN public.conversation_participants.last_read_at IS
  'When this participant last viewed the thread; messages after this from others count as unread.';

DROP POLICY IF EXISTS "participant update own read state" ON public.conversation_participants;
CREATE POLICY "participant update own read state"
  ON public.conversation_participants FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

GRANT UPDATE ON public.conversation_participants TO authenticated;

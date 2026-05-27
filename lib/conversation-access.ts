import type { SupabaseClient } from '@supabase/supabase-js'
import { canAccessOrgTeamMessages } from '@/lib/message-access'

export async function resolveMessagingOrganizationId(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data: org } = await supabase
    .from('organizations')
    .select('id')
    .eq('admin_user_id', userId)
    .maybeSingle()

  if (org?.id) return org.id

  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', userId)
    .eq('status', 'approved')
    .limit(1)
    .maybeSingle()

  return membership?.organization_id ?? null
}

export async function canUseOrgMessaging(
  supabase: SupabaseClient,
  userId: string,
  organizationId: string
): Promise<boolean> {
  return canAccessOrgTeamMessages(supabase, userId, organizationId)
}

export async function isConversationParticipant(
  supabase: SupabaseClient,
  conversationId: string,
  userId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('conversation_participants')
    .select('user_id')
    .eq('conversation_id', conversationId)
    .eq('user_id', userId)
    .maybeSingle()

  return Boolean(data)
}

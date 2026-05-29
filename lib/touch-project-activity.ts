import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

/** Bump last_activity_at so inactive-project retention reflects real usage. */
export async function touchProjectActivity(
  supabase: SupabaseClient,
  projectId: string
): Promise<void> {
  if (!projectId) return

  const { error } = await supabase
    .from('projects')
    .update({ last_activity_at: new Date().toISOString() })
    .eq('id', projectId)

  if (error) {
    console.warn('touchProjectActivity:', projectId, error.message)
  }
}

import {
  isProceduralInviteFormat,
  normalizeInviteCode,
} from '@/lib/invite-code'
import type { SupabaseClient } from '@supabase/supabase-js'

export async function lookupOrganizationByInvite(
  supabase: SupabaseClient,
  rawCode: string
): Promise<
  | { ok: true; code: string; organizationId: string; organizationName: string }
  | { ok: false; error: string }
> {
  const code = normalizeInviteCode(rawCode)

  if (!code) {
    return { ok: false, error: 'Company invite code is required.' }
  }

  if (!isProceduralInviteFormat(code)) {
    return {
      ok: false,
      error:
        'Invalid code format. Use the 8-character code from your company admin (letters and numbers only).',
    }
  }

  const { data: rows, error } = await supabase.rpc('lookup_org_by_invite', {
    p_code: code,
  })

  if (error) {
    return { ok: false, error: error.message }
  }

  const org = Array.isArray(rows) ? rows[0] : null

  if (!org?.organization_id) {
    return {
      ok: false,
      error: 'No company found for this code. Ask your admin for their worker invite code.',
    }
  }

  return {
    ok: true,
    code,
    organizationId: org.organization_id as string,
    organizationName: org.organization_name as string,
  }
}

import { NextResponse } from 'next/server'
import { loadTeamRoster } from '@/lib/team-roster'
import { requireAuth } from '@/lib/require-auth'

/** Assignable team members (admin + approved workers) for mentions and scheduling */
export async function GET() {
  try {
    const { supabase, user } = await requireAuth()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: org } = await supabase
      .from('organizations')
      .select('id')
      .eq('admin_user_id', user.id)
      .maybeSingle()

    let organizationId = org?.id

    if (!organizationId) {
      const { data: membership } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .eq('status', 'approved')
        .limit(1)
        .maybeSingle()
      organizationId = membership?.organization_id
    }

    if (!organizationId) {
      return NextResponse.json({ error: 'No organization' }, { status: 403 })
    }

    const roster = await loadTeamRoster(supabase, organizationId)
    return NextResponse.json({ roster })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load roster'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { generateInviteCode, isProceduralInviteFormat } from '@/lib/invite-code'
import { requireAuth } from '@/lib/require-auth'

/** Admin: issue a new procedural worker invite code */
export async function POST() {
  const { supabase, user } = await requireAuth()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: org } = await supabase
    .from('organizations')
    .select('id')
    .eq('admin_user_id', user.id)
    .maybeSingle()

  if (!org) {
    return NextResponse.json({ error: 'Not an organization admin' }, { status: 403 })
  }

  let inviteCode = generateInviteCode()
  for (let attempt = 0; attempt < 5; attempt++) {
    if (!isProceduralInviteFormat(inviteCode)) {
      inviteCode = generateInviteCode()
      continue
    }

    const { data: clash } = await supabase
      .from('organizations')
      .select('id')
      .eq('invite_code', inviteCode)
      .maybeSingle()

    if (!clash) break
    inviteCode = generateInviteCode()
  }

  const { error } = await supabase
    .from('organizations')
    .update({ invite_code: inviteCode })
    .eq('id', org.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ invite_code: inviteCode })
}

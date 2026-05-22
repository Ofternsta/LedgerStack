import { NextResponse } from 'next/server'
import { convertWorkerToAdmin } from '@/lib/become-admin'
import { requireAuth } from '@/lib/require-auth'

export async function POST(req: Request) {
  try {
    const { supabase, user } = await requireAuth()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const organizationName =
      (body.organization_name as string) || 'My Company'

    const result = await convertWorkerToAdmin(
      supabase,
      user.id,
      organizationName
    )

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({
      ok: true,
      invite_code: result.inviteCode,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Could not update account'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

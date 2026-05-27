import { NextResponse } from 'next/server'
import { createBillingPortalSession } from '@/lib/admin-billing-setup'
import { requireAuth } from '@/lib/require-auth'

export async function POST(req: Request) {
  try {
    const { supabase, user } = await requireAuth()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    }

    const { data: org } = await supabase
      .from('organizations')
      .select('id')
      .eq('admin_user_id', user.id)
      .maybeSingle()

    if (!org) {
      return NextResponse.json({ error: 'No organization' }, { status: 404 })
    }

    const body = await req.json().catch(() => ({}))
    const returnPath =
      typeof body.return_path === 'string'
        ? body.return_path
        : '/settings/billing'

    const result = await createBillingPortalSession(
      supabase,
      org.id,
      returnPath
    )

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ url: result.url })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Portal failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

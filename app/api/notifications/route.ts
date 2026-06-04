import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/require-auth'
import { createServiceClient } from '@/lib/supabase/service'

/** GET unread notifications for current user */
export async function GET() {
  const { user } = await requireAuth()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const service = createServiceClient()
  const { data, error } = await service
    .from('user_notifications')
    .select('id, type, title, body, href, reference_id, created_at, read_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(30)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const notifications = data || []
  const unread_count = notifications.filter((n) => !n.read_at).length

  return NextResponse.json({ notifications, unread_count })
}

/** PATCH mark notifications read { ids?: string[], all?: boolean } */
export async function PATCH(req: Request) {
  const { user } = await requireAuth()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const service = createServiceClient()
  const now = new Date().toISOString()

  if (body.all) {
    await service
      .from('user_notifications')
      .update({ read_at: now })
      .eq('user_id', user.id)
      .is('read_at', null)
    return NextResponse.json({ ok: true })
  }

  const ids = Array.isArray(body.ids) ? (body.ids as string[]) : []
  if (!ids.length) {
    return NextResponse.json({ error: 'ids or all required' }, { status: 400 })
  }

  await service
    .from('user_notifications')
    .update({ read_at: now })
    .eq('user_id', user.id)
    .in('id', ids)

  return NextResponse.json({ ok: true })
}

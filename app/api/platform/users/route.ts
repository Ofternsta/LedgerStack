import { NextResponse } from 'next/server'
import { deleteUserAccount } from '@/lib/delete-user-account'
import { isPlatformOwner } from '@/lib/platform-owner'
import { requireAuth } from '@/lib/require-auth'
import { createServiceClient } from '@/lib/supabase/service'

async function requirePlatformOwner() {
  const { user } = await requireAuth()
  if (!user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  if (!isPlatformOwner(user.email)) {
    return {
      error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    }
  }

  return { user }
}

/** List signed-up accounts (platform owner only) */
export async function GET() {
  const gate = await requirePlatformOwner()
  if ('error' in gate && gate.error) return gate.error

  try {
    const supabase = createServiceClient()

    const { data: listData, error: listError } =
      await supabase.auth.admin.listUsers({ perPage: 1000 })

    if (listError) {
      return NextResponse.json({ error: listError.message }, { status: 500 })
    }

    const authUsers = listData.users || []
    const ids = authUsers.map((u) => u.id)

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, role, full_name, created_at')
      .in('id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000'])

    const profileMap = Object.fromEntries(
      (profiles || []).map((p) => [p.id, p])
    )

    const users = authUsers.map((u) => ({
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      role: profileMap[u.id]?.role ?? 'unknown',
      full_name: profileMap[u.id]?.full_name ?? null,
      is_platform_owner: isPlatformOwner(u.email),
    }))

    return NextResponse.json({ users })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to list users'
    return NextResponse.json({ error: message }, { status: 503 })
  }
}

/** Delete an account (platform owner only) */
export async function DELETE(req: Request) {
  const gate = await requirePlatformOwner()
  if ('error' in gate && gate.error) return gate.error
  const { user: requester } = gate

  if (!requester) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const targetUserId = body.user_id as string | undefined

  if (!targetUserId) {
    return NextResponse.json({ error: 'user_id is required' }, { status: 400 })
  }

  if (targetUserId === requester.id) {
    return NextResponse.json(
      { error: 'You cannot delete your own account from here.' },
      { status: 400 }
    )
  }

  try {
    const supabase = createServiceClient()

    const { data: targetUser, error: getError } =
      await supabase.auth.admin.getUserById(targetUserId)

    if (getError || !targetUser.user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (isPlatformOwner(targetUser.user.email)) {
      return NextResponse.json(
        { error: 'Cannot delete another platform owner account.' },
        { status: 400 }
      )
    }

    const result = await deleteUserAccount(supabase, targetUserId)

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      deleted_email: targetUser.user.email,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Delete failed'
    return NextResponse.json({ error: message }, { status: 503 })
  }
}

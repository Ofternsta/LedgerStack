import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/require-auth'
import { createServiceClient } from '@/lib/supabase/service'

const FULL_NAME_MAX_LENGTH = 120

export async function PATCH(req: Request) {
  try {
    const { user } = await requireAuth()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const raw = typeof body.full_name === 'string' ? body.full_name : ''
    const fullName = raw.trim().replace(/\s+/g, ' ')

    if (fullName.length > FULL_NAME_MAX_LENGTH) {
      return NextResponse.json(
        { error: `Display name must be ${FULL_NAME_MAX_LENGTH} characters or fewer.` },
        { status: 400 }
      )
    }

    const service = createServiceClient()
    const { data, error } = await service
      .from('profiles')
      .update({ full_name: fullName || null })
      .eq('id', user.id)
      .select('full_name')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ full_name: data.full_name })
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Could not update profile'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

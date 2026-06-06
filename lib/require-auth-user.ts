import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/require-auth'

export async function requireAuthUser() {
  const { supabase, user } = await requireAuth()
  if (!user) {
    return {
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    } as const
  }
  return { supabase, user } as const
}

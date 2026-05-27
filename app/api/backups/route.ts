import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/require-auth'

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

    if (!org) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: backups, error } = await supabase
      .from('organization_backups')
      .select(
        'id, project_id, backup_type, filename, byte_size, status, error_message, created_at'
      )
      .eq('organization_id', org.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ backups: backups || [] })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to list backups'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

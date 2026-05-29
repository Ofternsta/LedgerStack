import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/require-auth'

const BACKUP_BUCKET = 'org-backups'

type RouteContext = { params: Promise<{ id: string }> }

/** Admin: delete a backup ZIP and free a slot in the 30-backup limit. */
export async function DELETE(_req: Request, context: RouteContext) {
  try {
    const { id: backupId } = await context.params
    const { supabase, user } = await requireAuth()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: backup } = await supabase
      .from('organization_backups')
      .select('id, storage_path, organization_id')
      .eq('id', backupId)
      .maybeSingle()

    if (!backup) {
      return NextResponse.json({ error: 'Backup not found' }, { status: 404 })
    }

    const { data: org } = await supabase
      .from('organizations')
      .select('id')
      .eq('id', backup.organization_id)
      .eq('admin_user_id', user.id)
      .maybeSingle()

    if (!org) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (backup.storage_path) {
      await supabase.storage.from(BACKUP_BUCKET).remove([backup.storage_path])
    }

    const { error } = await supabase
      .from('organization_backups')
      .delete()
      .eq('id', backupId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Delete failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

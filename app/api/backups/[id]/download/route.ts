import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/require-auth'

const BACKUP_BUCKET = 'org-backups'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_req: Request, context: RouteContext) {
  try {
    const { id: backupId } = await context.params
    const { supabase, user } = await requireAuth()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: backup } = await supabase
      .from('organization_backups')
      .select('id, storage_path, filename, status, organization_id')
      .eq('id', backupId)
      .maybeSingle()

    if (!backup || backup.status !== 'completed') {
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

    const { data: file, error } = await supabase.storage
      .from(BACKUP_BUCKET)
      .download(backup.storage_path)

    if (error || !file) {
      return NextResponse.json(
        { error: error?.message || 'Could not download backup file' },
        { status: 500 }
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${backup.filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Download failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import {
  createBackupServiceClient,
  orgCanUseBackups,
  runScheduledBackupForOrg,
} from '@/lib/organization-backups'
import { requireAuth } from '@/lib/require-auth'

export const maxDuration = 300

/** Admin: run a full organization backup now (all projects). */
export async function POST() {
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

    if (!(await orgCanUseBackups(supabase, org.id))) {
      return NextResponse.json(
        {
          error:
            'Automatic backups require a plan with exports (Starter or higher).',
        },
        { status: 403 }
      )
    }

    const service = createBackupServiceClient()

    const result = await runScheduledBackupForOrg(service, org.id, {
      force: true,
      backupType: 'manual',
    })

    return NextResponse.json({
      ok: true,
      projects_backed_up: result.backedUp,
      error: result.error,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Backup failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

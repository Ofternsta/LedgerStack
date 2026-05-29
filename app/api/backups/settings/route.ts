import { NextResponse } from 'next/server'
import {
  createBackupServiceClient,
  enforceOrganizationBackupLimit,
  getOrganizationBackupLimit,
  loadBackupSettings,
} from '@/lib/organization-backups'
import { getOrgPlanContext } from '@/lib/org-plan'
import { requireAuth } from '@/lib/require-auth'

async function requireOrgAdmin(supabase: Awaited<ReturnType<typeof requireAuth>>['supabase'], userId: string) {
  const { data: org } = await supabase
    .from('organizations')
    .select('id')
    .eq('admin_user_id', userId)
    .maybeSingle()

  return org?.id ?? null
}

export async function GET() {
  try {
    const { supabase, user } = await requireAuth()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const organizationId = await requireOrgAdmin(supabase, user.id)
    if (!organizationId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const service = createBackupServiceClient()
    await enforceOrganizationBackupLimit(service, organizationId)

    const settings = await loadBackupSettings(supabase, organizationId)
    const maxBackups = await getOrganizationBackupLimit(service, organizationId)
    const planCtx = await getOrgPlanContext(supabase, organizationId)
    return NextResponse.json({
      settings,
      max_backups: maxBackups,
      plan: planCtx?.plan ?? null,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load settings'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const { supabase, user } = await requireAuth()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const organizationId = await requireOrgAdmin(supabase, user.id)
    if (!organizationId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json().catch(() => ({}))
    const update: Record<string, unknown> = {}

    if (typeof body.backup_enabled === 'boolean') {
      update.backup_enabled = body.backup_enabled
    }
    if (body.backup_frequency === 'daily' || body.backup_frequency === 'weekly') {
      update.backup_frequency = body.backup_frequency
    }
    if (typeof body.backup_on_report_completed === 'boolean') {
      update.backup_on_report_completed = body.backup_on_report_completed
    }

    if (!Object.keys(update).length) {
      return NextResponse.json({ error: 'No settings to update' }, { status: 400 })
    }

    const { error } = await supabase
      .from('organizations')
      .update(update)
      .eq('id', organizationId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const settings = await loadBackupSettings(supabase, organizationId)
    const maxBackups = await getOrganizationBackupLimit(supabase, organizationId)
    return NextResponse.json({ settings, max_backups: maxBackups })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to save settings'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

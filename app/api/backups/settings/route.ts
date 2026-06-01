import { NextResponse } from 'next/server'
import {
  countCompletedOrganizationBackups,
  createBackupServiceClient,
  enforceOrganizationBackupLimit,
  getOrganizationBackupLimit,
  loadBackupSettings,
} from '@/lib/organization-backups'
import { getOrgPlanContext } from '@/lib/org-plan'
import { isUnlimited } from '@/lib/plan-entitlements'
import { requireAuth } from '@/lib/require-auth'

async function requireOrgAdmin(supabase: Awaited<ReturnType<typeof requireAuth>>['supabase'], userId: string) {
  const { data: org } = await supabase
    .from('organizations')
    .select('id')
    .eq('admin_user_id', userId)
    .maybeSingle()

  return org?.id ?? null
}

type ProjectLite = {
  id: string
  customer_name: string
  project_address: string
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
    const maxBackups = await getOrganizationBackupLimit(service, organizationId)
    const completedBeforePrune = await countCompletedOrganizationBackups(
      service,
      organizationId
    )
    await enforceOrganizationBackupLimit(service, organizationId)

    const settings = await loadBackupSettings(supabase, organizationId)
    if (!settings) {
      return NextResponse.json(
        { error: 'Organization not found.' },
        { status: 404 }
      )
    }
    const planCtx = await getOrgPlanContext(supabase, organizationId)
    const { data: projects } = await supabase
      .from('projects')
      .select('id, customer_name, project_address, created_at')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })

    const allProjects = (projects || []) as Array<ProjectLite & { created_at?: string }>
    const projectLimit =
      planCtx?.entitlements.maxActiveProjects ?? allProjects.length
    const allowedCount = isUnlimited(projectLimit)
      ? allProjects.length
      : Math.min(projectLimit, allProjects.length)
    const allowedProjects = allProjects.slice(0, allowedCount).map((p) => ({
      id: p.id,
      customer_name: p.customer_name,
      project_address: p.project_address,
    }))

    return NextResponse.json({
      settings,
      max_backups: maxBackups,
      plan: planCtx?.plan ?? null,
      project_limit: projectLimit,
      project_count: allProjects.length,
      allowed_projects: allowedProjects,
      completed_backup_count: completedBeforePrune,
      backup_prune_warning:
        completedBeforePrune > maxBackups
          ? `You had ${completedBeforePrune} backups; the oldest were removed to match your plan limit of ${maxBackups}.`
          : completedBeforePrune === maxBackups && maxBackups > 0
            ? `You are at your plan limit of ${maxBackups} retained backups. If you downgrade, older backups may be removed automatically to match the lower limit.`
            : null,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load settings'
    const hint = message.includes('backup_')
      ? ' Run supabase/automatic-backups.sql on your Supabase project.'
      : ''
    return NextResponse.json({ error: message + hint }, { status: 500 })
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

    const planCtx = await getOrgPlanContext(supabase, organizationId)
    if (!planCtx) {
      return NextResponse.json({ error: 'Active subscription required.' }, { status: 403 })
    }

    if (typeof body.backup_enabled === 'boolean') {
      update.backup_enabled = body.backup_enabled
    }
    if (body.backup_frequency === 'daily' || body.backup_frequency === 'weekly') {
      update.backup_frequency = body.backup_frequency
    }
    if (typeof body.backup_on_report_completed === 'boolean') {
      update.backup_on_report_completed = body.backup_on_report_completed
    }
    if (body.backup_project_ids !== undefined) {
      if (!Array.isArray(body.backup_project_ids)) {
        return NextResponse.json(
          { error: 'backup_project_ids must be an array' },
          { status: 400 }
        )
      }
      const rawIds: unknown[] = body.backup_project_ids
      const ids = [
        ...new Set(
          rawIds
            .map((v) => String(v).trim())
            .filter((v): v is string => v.length > 0)
        ),
      ]
      const { data: ownedRows } = await supabase
        .from('projects')
        .select('id, created_at')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
      const owned = new Set((ownedRows || []).map((r) => String(r.id)))
      const validIds = ids.filter((id) => owned.has(id))
      const projectLimit = planCtx.entitlements.maxActiveProjects
      if (!isUnlimited(projectLimit) && validIds.length > projectLimit) {
        return NextResponse.json(
          {
            error: `This plan allows selecting up to ${projectLimit} project(s) for automatic backups.`,
          },
          { status: 400 }
        )
      }
      update.backup_project_ids = validIds
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
    if (!settings) {
      return NextResponse.json({ error: 'Organization not found.' }, { status: 404 })
    }
    const service = createBackupServiceClient()
    const maxBackups = await getOrganizationBackupLimit(service, organizationId)
    const completedCount = await countCompletedOrganizationBackups(
      service,
      organizationId
    )
    return NextResponse.json({
      settings,
      max_backups: maxBackups,
      completed_backup_count: completedCount,
      backup_prune_warning:
        completedCount >= maxBackups && maxBackups > 0
          ? `You are at your plan limit of ${maxBackups} retained backups. If you downgrade, older backups may be removed automatically to match the lower limit.`
          : null,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to save settings'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

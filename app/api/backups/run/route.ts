import { NextResponse } from 'next/server'
import {
  createBackupServiceClient,
  getOrganizationBackupLimit,
  orgCanUseBackups,
  runScheduledBackupForOrg,
} from '@/lib/organization-backups'
import { getOrgPlanContext } from '@/lib/org-plan'
import { isUnlimited } from '@/lib/plan-entitlements'
import { requireAuth } from '@/lib/require-auth'

export const maxDuration = 300

/** Admin: run a full organization backup now (all projects). */
export async function POST(req: Request) {
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

    const body = await req.json().catch(() => ({}))
    const runMode = String(body.mode || 'all')
    const rawProjectIds: unknown[] = Array.isArray(body.project_ids)
      ? body.project_ids
      : []
    const requestedIds = [
      ...new Set(
        rawProjectIds
          .map((v) => String(v).trim())
          .filter((v): v is string => v.length > 0)
      ),
    ]

    const service = createBackupServiceClient()
    const planCtx = await getOrgPlanContext(service, org.id)
    const { data: projects } = await service
      .from('projects')
      .select('id, created_at')
      .eq('organization_id', org.id)
      .order('created_at', { ascending: false })
    const allProjectIds = (projects || []).map((p) => String(p.id))
    const projectLimit = planCtx?.entitlements.maxActiveProjects ?? allProjectIds.length

    if (
      runMode === 'all' &&
      !isUnlimited(projectLimit) &&
      allProjectIds.length > projectLimit
    ) {
      return NextResponse.json(
        {
          error:
            `You currently have ${allProjectIds.length} projects but this plan allows ${projectLimit}. ` +
            'Use automatic backups (project picker) or Back up specific projects instead.',
        },
        { status: 400 }
      )
    }

    let projectIds: string[] | undefined
    if (runMode === 'specific') {
      projectIds = requestedIds.filter((id) => allProjectIds.includes(id))
      if (!projectIds.length) {
        return NextResponse.json(
          { error: 'Select at least one project to back up.' },
          { status: 400 }
        )
      }
      if (!isUnlimited(projectLimit) && projectIds.length > projectLimit) {
        return NextResponse.json(
          { error: `This plan allows backing up up to ${projectLimit} selected projects at a time.` },
          { status: 400 }
        )
      }
    }

    const result = await runScheduledBackupForOrg(service, org.id, {
      force: true,
      backupType: 'manual',
      projectIds,
    })

    const maxBackups = await getOrganizationBackupLimit(service, org.id)

    return NextResponse.json({
      ok: true,
      projects_backed_up: result.backedUp,
      error: result.error,
      max_backups: maxBackups,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Backup failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

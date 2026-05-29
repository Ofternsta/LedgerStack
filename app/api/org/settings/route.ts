import { NextResponse } from 'next/server'
import { parseDefaultWorkerPermissions } from '@/lib/org-status-labels'
import { loadUserAccessServer } from '@/lib/load-access-server'
import { requireAuth } from '@/lib/require-auth'
import {
  DEFAULT_WORKER_PERMISSIONS,
  type WorkerPermissionKey,
  type WorkerPermissions,
} from '@/lib/worker-permissions'

function parseWorkerPatch(body: Record<string, unknown>): WorkerPermissions | null {
  const keys: WorkerPermissionKey[] = [
    'can_upload',
    'can_delete',
    'can_add_events',
    'can_view_files',
  ]
  if (!keys.every((k) => typeof body[k] === 'boolean')) return null
  return {
    can_upload: Boolean(body.can_upload),
    can_delete: Boolean(body.can_delete),
    can_add_events: Boolean(body.can_add_events),
    can_view_files: Boolean(body.can_view_files),
  }
}

export async function GET() {
  try {
    const { supabase, user } = await requireAuth()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { access } = await loadUserAccessServer()
    if (!access?.canManageSystemSettings || !access.organizationId) {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    }

    const { data, error } = await supabase
      .from('organizations')
      .select('default_worker_permissions')
      .eq('id', access.organizationId)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      default_worker_permissions: parseDefaultWorkerPermissions(
        data?.default_worker_permissions
      ),
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

    const { access } = await loadUserAccessServer()
    if (!access?.canManageSystemSettings || !access.organizationId) {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    }

    const body = await req.json().catch(() => ({}))
    const patch: Record<string, unknown> = {}

    if (body.default_worker_permissions !== undefined) {
      const perms = parseWorkerPatch(
        body.default_worker_permissions as Record<string, unknown>
      )
      if (!perms) {
        return NextResponse.json(
          { error: 'Invalid default_worker_permissions' },
          { status: 400 }
        )
      }
      patch.default_worker_permissions = perms
    }

    if (!Object.keys(patch).length) {
      return NextResponse.json({ error: 'No changes provided' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('organizations')
      .update(patch)
      .eq('id', access.organizationId)
      .select('default_worker_permissions')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      default_worker_permissions:
        parseDefaultWorkerPermissions(data.default_worker_permissions) ??
        DEFAULT_WORKER_PERMISSIONS,
    })
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Failed to update settings'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

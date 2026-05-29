import {
  DEFAULT_WORKER_PERMISSIONS,
  type WorkerPermissions,
} from '@/lib/worker-permissions'

export function parseDefaultWorkerPermissions(
  raw: unknown
): WorkerPermissions {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_WORKER_PERMISSIONS }
  }
  const o = raw as Record<string, unknown>
  return {
    can_upload: Boolean(o.can_upload ?? DEFAULT_WORKER_PERMISSIONS.can_upload),
    can_delete: Boolean(o.can_delete ?? DEFAULT_WORKER_PERMISSIONS.can_delete),
    can_add_events: Boolean(
      o.can_add_events ?? DEFAULT_WORKER_PERMISSIONS.can_add_events
    ),
    can_view_files: Boolean(
      o.can_view_files ?? DEFAULT_WORKER_PERMISSIONS.can_view_files
    ),
  }
}

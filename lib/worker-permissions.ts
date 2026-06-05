export type WorkerPermissionKey =
  | 'can_upload'
  | 'can_delete'
  | 'can_add_events'
  | 'can_view_files'
  | 'can_download_files'
  | 'can_use_ai_chat'

export type WorkerPermissions = Record<WorkerPermissionKey, boolean>

export const DEFAULT_WORKER_PERMISSIONS: WorkerPermissions = {
  can_upload: true,
  can_delete: false,
  can_add_events: true,
  can_view_files: true,
  can_download_files: true,
  can_use_ai_chat: false,
}

export const WORKER_PERMISSION_LABELS: Record<
  WorkerPermissionKey,
  { label: string; description: string }
> = {
  can_upload: {
    label: 'Upload files',
    description: 'Add photos, PDFs, and documents to projects',
  },
  can_delete: {
    label: 'Delete files',
    description: 'Remove uploaded documents from storage',
  },
  can_add_events: {
    label: 'Add calendar events',
    description: 'Create and edit schedule items on projects',
  },
  can_view_files: {
    label: 'View files',
    description: 'Open and browse project documents',
  },
  can_download_files: {
    label: 'Download files',
    description: 'Save project documents to their device',
  },
  can_use_ai_chat: {
    label: 'AI project chat',
    description: 'Use the project AI assistant on assigned jobs',
  },
}

export function parseWorkerPermissions(row: {
  can_upload?: boolean | null
  can_delete?: boolean | null
  can_add_events?: boolean | null
  can_view_files?: boolean | null
  can_download_files?: boolean | null
  can_use_ai_chat?: boolean | null
} | null | undefined): WorkerPermissions {
  if (!row) return { ...DEFAULT_WORKER_PERMISSIONS }
  return {
    can_upload: row.can_upload ?? DEFAULT_WORKER_PERMISSIONS.can_upload,
    can_delete: row.can_delete ?? DEFAULT_WORKER_PERMISSIONS.can_delete,
    can_add_events:
      row.can_add_events ?? DEFAULT_WORKER_PERMISSIONS.can_add_events,
    can_view_files:
      row.can_view_files ?? DEFAULT_WORKER_PERMISSIONS.can_view_files,
    can_download_files:
      row.can_download_files ?? DEFAULT_WORKER_PERMISSIONS.can_download_files,
    can_use_ai_chat:
      row.can_use_ai_chat ?? DEFAULT_WORKER_PERMISSIONS.can_use_ai_chat,
  }
}

export function adminWorkerPermissions(): WorkerPermissions {
  return {
    can_upload: true,
    can_delete: true,
    can_add_events: true,
    can_view_files: true,
    can_download_files: true,
    can_use_ai_chat: true,
  }
}

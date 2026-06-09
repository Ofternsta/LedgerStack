import type { UserAccess } from '@/lib/roles'

export function accessRoleLabel(role: UserAccess['role']): string {
  if (role === 'admin') return 'Admin'
  if (role === 'worker') return 'Worker'
  return 'Client'
}

/** Header subtitle: `Jane Doe (Admin) · West Coast Construction` */
export function accessShellSubtitle(access: UserAccess): string {
  const title =
    access.jobTitle?.trim() || accessRoleLabel(access.role)
  const name = access.displayName?.trim()
  const who = name ? `${name} (${title})` : title
  return access.organizationName ? `${who} · ${access.organizationName}` : who
}

export function defaultJobTitleForRole(
  role: UserAccess['role'],
  workerJobTitle?: string | null
): string {
  const custom = workerJobTitle?.trim()
  if (custom) return custom
  return accessRoleLabel(role)
}

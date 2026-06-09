import type { UserAccess } from '@/lib/roles'

export function accessRoleLabel(role: UserAccess['role']): string {
  if (role === 'admin') return 'Admin'
  if (role === 'worker') return 'Worker'
  return 'Client'
}

/** Header subtitle: `Admin · Acme Contracting` */
export function accessShellSubtitle(access: UserAccess): string {
  const role = accessRoleLabel(access.role)
  return access.organizationName ? `${role} · ${access.organizationName}` : role
}

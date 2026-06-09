import type { AppRole } from '@/lib/roles'
import { defaultJobTitleForRole } from '@/lib/access-role-label'

export function profileDisplayFields(input: {
  role: AppRole
  fullName?: string | null
  workerJobTitle?: string | null
}) {
  return {
    displayName: input.fullName?.trim() || null,
    jobTitle: defaultJobTitleForRole(input.role, input.workerJobTitle),
  }
}

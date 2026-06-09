import type { BillingPlanId } from '@/lib/stripe-config'
import type { PlanEntitlements } from '@/lib/plan-entitlements'
import {
  adminWorkerPermissions,
  type WorkerPermissions,
} from '@/lib/worker-permissions'

export type AppRole = 'admin' | 'worker' | 'client'

export type WorkerStatus = 'pending' | 'approved' | 'none'

export type UserAccess = {
  role: AppRole
  organizationId: string | null
  organizationName: string | null
  inviteCode: string | null
  workerStatus: WorkerStatus
  plan: BillingPlanId | null
  planName: string | null
  aiSummariesUsed: number
  aiSummariesLimit: number
  activeProjectsLimit: number
  canCreateProject: boolean
  canDeleteProject: boolean
  canUploadEvidence: boolean
  canViewFiles: boolean
  canDownloadFiles: boolean
  canEditEvidenceSummary: boolean
  canDeleteEvidence: boolean
  canManageTeam: boolean
  canManageProjectClients: boolean
  /** Staff (admin + approved workers) with plan — AI, notes, schedule, etc. */
  canUpdateClaimInfo: boolean
  /** Report workflow status (Inspection → Completed) — admins only */
  canUpdateReportStatus: boolean
  /** Job timeline — organization admins only */
  canViewTimeline: boolean
  /** AI summary & export — organization admins only */
  canViewAiSummaryExport: boolean
  canViewInternalNotes: boolean
  canViewCalendar: boolean
  canManageSchedule: boolean
  canViewAnalytics: boolean
  canManageBilling: boolean
  canManageSystemSettings: boolean
  canViewClientPortal: boolean
  canApproveDocuments: boolean
  canExportPdf: boolean
  canExportHtml: boolean
  canUseTeamMessages: boolean
  canUseClaimPacketExport: boolean
  canArchiveProject: boolean
  /** Per-project worker flag (set on project page from assignment permissions). */
  canUseProjectAiChat?: boolean
  downgradeReadOnly: boolean
  overProjectLimit: boolean
  overStaffLimit: boolean
  workerBlockedByStaffLimit: boolean
  downgradeNotice: string | null
}

export function buildAccess(input: {
  role: AppRole
  organizationId: string | null
  organizationName?: string | null
  inviteCode?: string | null
  workerStatus: WorkerStatus
  plan?: BillingPlanId | null
  planName?: string | null
  entitlements?: PlanEntitlements | null
  aiSummariesUsed?: number
  activeProjectCount?: number
  approvedWorkerCount?: number
  workerPermissions?: WorkerPermissions | null
}): UserAccess {
  const { role, organizationId, workerStatus } = input
  const isAdmin = role === 'admin'
  const workerApproved = role === 'worker' && workerStatus === 'approved'
  const isClient = role === 'client'
  const ent = input.entitlements
  const hasPlan = Boolean(input.plan && ent)

  const staffCapable = isAdmin || workerApproved
  const wp =
    isAdmin
      ? adminWorkerPermissions()
      : workerApproved
        ? input.workerPermissions
        : null
  const aiLimit = ent?.aiSummariesPerMonth ?? 0
  const projectLimit = ent?.maxActiveProjects ?? 0
  const staffLimit = ent?.maxStaffUsers ?? 0
  const activeProjectCount = input.activeProjectCount ?? 0
  const approvedWorkerCount = input.approvedWorkerCount ?? 0
  const staffCountIncludingAdmin = isAdmin
    ? 1 + approvedWorkerCount
    : approvedWorkerCount + 1
  const overProjectLimit = Boolean(
    hasPlan && ent && ent.maxActiveProjects >= 0 && activeProjectCount > ent.maxActiveProjects
  )
  const overStaffLimit = Boolean(
    hasPlan && ent && ent.maxStaffUsers >= 0 && staffCountIncludingAdmin > ent.maxStaffUsers
  )
  const workerBlockedByStaffLimit = role === 'worker' && workerApproved && overStaffLimit
  const downgradeReadOnly = isAdmin && overProjectLimit

  const canManageTeam = isAdmin && Boolean(ent?.workerAccounts)
  const canManageProjectClients = isAdmin && Boolean(ent?.clientPortal)
  const canViewInternalNotes =
    staffCapable && Boolean(ent?.internalNotes)
  const canViewCalendar = staffCapable && Boolean(ent?.scheduling)
  const canManageSchedule =
    canViewCalendar && Boolean(isAdmin || wp?.can_add_events)
  const canViewFiles =
    isClient ||
    (staffCapable &&
      hasPlan &&
      !workerBlockedByStaffLimit &&
      Boolean(isAdmin || wp?.can_view_files))
  const canDownloadFiles =
    isClient ||
    (staffCapable &&
      hasPlan &&
      !workerBlockedByStaffLimit &&
      Boolean(isAdmin || wp?.can_download_files))
  const canViewAnalytics =
    isAdmin &&
    Boolean(ent?.analyticsDashboard || ent?.advancedAnalytics)
  const canUseTeamMessages = staffCapable && Boolean(ent?.teamMessages)
  const canViewAiSummaryExport = isAdmin && hasPlan && !downgradeReadOnly
  const canExportPdf =
    canViewAiSummaryExport &&
    Boolean(ent?.standardPdfExport || ent?.claimPacketExport)
  const canExportHtml =
    canViewAiSummaryExport &&
    Boolean(ent?.standardPdfExport || ent?.claimPacketExport)

  let canCreateProject = isAdmin
  if (hasPlan && ent && ent.maxActiveProjects >= 0) {
    if (activeProjectCount >= ent.maxActiveProjects) {
      canCreateProject = false
    }
  }
  if (!hasPlan && isAdmin) {
    canCreateProject = false
  }

  const downgradeNotice = workerBlockedByStaffLimit
    ? `Your organization currently has ${staffCountIncludingAdmin} staff users, but your plan allows ${staffLimit}. Workers are blocked from projects until the org is within the staff limit or upgrades.`
    : downgradeReadOnly
      ? `Your organization currently has ${activeProjectCount} projects, but your plan allows ${projectLimit}. Admin access is read-only until projects are completed/deleted to the limit or the plan is upgraded.`
      : null

  return {
    role,
    organizationId,
    organizationName: input.organizationName ?? null,
    inviteCode: input.inviteCode ?? null,
    workerStatus,
    plan: input.plan ?? null,
    planName: input.planName ?? null,
    aiSummariesUsed: input.aiSummariesUsed ?? 0,
    aiSummariesLimit: aiLimit,
    activeProjectsLimit: projectLimit,
    canCreateProject,
    canDeleteProject: isAdmin,
    canUploadEvidence:
      staffCapable &&
      hasPlan &&
      !workerBlockedByStaffLimit &&
      !downgradeReadOnly &&
      Boolean(isAdmin || wp?.can_upload),
    canViewFiles,
    canDownloadFiles,
    canEditEvidenceSummary: isAdmin && !downgradeReadOnly,
    canDeleteEvidence:
      (isAdmin && !downgradeReadOnly) ||
      (workerApproved &&
        hasPlan &&
        !workerBlockedByStaffLimit &&
        Boolean(wp?.can_delete)),
    canManageTeam,
    canManageProjectClients,
    canUpdateClaimInfo:
      staffCapable && hasPlan && !workerBlockedByStaffLimit && !downgradeReadOnly,
    canUpdateReportStatus: isAdmin && hasPlan,
    canViewTimeline: isAdmin && hasPlan && !downgradeReadOnly,
    canViewAiSummaryExport,
    canViewInternalNotes: canViewInternalNotes && !downgradeReadOnly,
    canViewCalendar:
      canViewCalendar && !workerBlockedByStaffLimit && !downgradeReadOnly,
    canManageSchedule: canManageSchedule && !downgradeReadOnly && !workerBlockedByStaffLimit,
    canViewAnalytics,
    canManageBilling: isAdmin,
    canManageSystemSettings: isAdmin,
    canViewClientPortal: false,
    canApproveDocuments: isClient,
    canExportPdf,
    canExportHtml,
    canUseTeamMessages: canUseTeamMessages && !downgradeReadOnly,
    canUseClaimPacketExport: Boolean(ent?.claimPacketExport),
    canArchiveProject:
      isAdmin &&
      hasPlan &&
      !downgradeReadOnly &&
      Boolean(ent?.claimPacketExport || ent?.standardPdfExport),
    downgradeReadOnly,
    overProjectLimit,
    overStaffLimit,
    workerBlockedByStaffLimit,
    downgradeNotice,
  }
}

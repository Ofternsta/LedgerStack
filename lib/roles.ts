import type { BillingPlanId } from '@/lib/stripe-config'
import type { PlanEntitlements } from '@/lib/plan-entitlements'

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
  canEditEvidenceSummary: boolean
  canDeleteEvidence: boolean
  canManageTeam: boolean
  canManageProjectClients: boolean
  canUpdateClaimInfo: boolean
  canViewInternalNotes: boolean
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
  exportHasWatermark: boolean
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
}): UserAccess {
  const { role, organizationId, workerStatus } = input
  const isAdmin = role === 'admin'
  const workerApproved = role === 'worker' && workerStatus === 'approved'
  const isClient = role === 'client'
  const ent = input.entitlements
  const hasPlan = Boolean(input.plan && ent)

  const staffCapable = isAdmin || workerApproved
  const aiLimit = ent?.aiSummariesPerMonth ?? 0
  const projectLimit = ent?.maxActiveProjects ?? 0

  const canManageTeam = isAdmin && Boolean(ent?.workerAccounts)
  const canManageProjectClients = isAdmin && Boolean(ent?.clientPortal)
  const canViewInternalNotes =
    staffCapable && Boolean(ent?.internalNotes)
  const canManageSchedule = staffCapable && Boolean(ent?.scheduling)
  const canViewAnalytics =
    isAdmin &&
    Boolean(ent?.analyticsDashboard || ent?.advancedAnalytics)
  const canUseTeamMessages = staffCapable && Boolean(ent?.teamMessages)
  const canExportPdf =
    staffCapable &&
    Boolean(ent?.standardPdfExport || ent?.claimPacketExport)
  const canExportHtml =
    staffCapable &&
    (Boolean(ent?.standardPdfExport) ||
      Boolean(ent?.exportWatermark) ||
      Boolean(ent?.claimPacketExport))

  let canCreateProject = isAdmin || workerApproved
  if (hasPlan && ent && ent.maxActiveProjects >= 0) {
    const count = input.activeProjectCount ?? 0
    if (count >= ent.maxActiveProjects) {
      canCreateProject = false
    }
  }
  if (!hasPlan && isAdmin) {
    canCreateProject = false
  }

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
    canUploadEvidence: staffCapable && hasPlan,
    canEditEvidenceSummary: isAdmin,
    canDeleteEvidence: isAdmin,
    canManageTeam,
    canManageProjectClients,
    canUpdateClaimInfo: staffCapable && hasPlan,
    canViewInternalNotes,
    canManageSchedule,
    canViewAnalytics,
    canManageBilling: isAdmin,
    canManageSystemSettings: isAdmin,
    canViewClientPortal: isClient,
    canApproveDocuments: isClient,
    canExportPdf,
    canExportHtml,
    canUseTeamMessages,
    canUseClaimPacketExport: Boolean(ent?.claimPacketExport),
    exportHasWatermark: Boolean(ent?.exportWatermark),
  }
}

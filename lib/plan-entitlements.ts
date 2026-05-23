import type { BillingPlanId } from '@/lib/stripe-config'

/** Capability flags and numeric limits per subscription tier. */
export type PlanEntitlements = {
  tagline: string
  /** Admin + approved workers; -1 = unlimited */
  maxStaffUsers: number
  /** Active projects; -1 = unlimited */
  maxActiveProjects: number
  /** Claim summaries / timeline AI per calendar month; -1 = unlimited */
  aiSummariesPerMonth: number
  maxUploadBytes: number
  /** Images + PDF only (no video) */
  basicUploadsOnly: boolean
  exportWatermark: boolean
  standardPdfExport: boolean
  brandedExports: boolean
  claimPacketExport: boolean
  clientPortal: boolean
  workerAccounts: boolean
  internalNotes: boolean
  scheduling: boolean
  teamMessages: boolean
  analyticsDashboard: boolean
  advancedAnalytics: boolean
}

export const PLAN_ENTITLEMENTS: Record<BillingPlanId, PlanEntitlements> = {
  trial: {
    tagline: 'Experience the workflow — limited seats and exports',
    maxStaffUsers: 1,
    maxActiveProjects: 2,
    aiSummariesPerMonth: 10,
    maxUploadBytes: 10 * 1024 * 1024,
    basicUploadsOnly: true,
    exportWatermark: true,
    standardPdfExport: false,
    brandedExports: false,
    claimPacketExport: false,
    clientPortal: false,
    workerAccounts: false,
    internalNotes: false,
    scheduling: false,
    teamMessages: false,
    analyticsDashboard: false,
    advancedAnalytics: false,
  },
  starter: {
    tagline: 'Solo contractor — organized documentation for one person',
    maxStaffUsers: 1,
    maxActiveProjects: 25,
    aiSummariesPerMonth: 50,
    maxUploadBytes: 25 * 1024 * 1024,
    basicUploadsOnly: false,
    exportWatermark: false,
    standardPdfExport: true,
    brandedExports: false,
    claimPacketExport: false,
    clientPortal: false,
    workerAccounts: false,
    internalNotes: false,
    scheduling: false,
    teamMessages: false,
    analyticsDashboard: false,
    advancedAnalytics: false,
  },
  professional: {
    tagline: 'Team operations — coordinate workers, clients, and schedules',
    maxStaffUsers: 15,
    maxActiveProjects: 100,
    aiSummariesPerMonth: 250,
    maxUploadBytes: 50 * 1024 * 1024,
    basicUploadsOnly: false,
    exportWatermark: false,
    standardPdfExport: true,
    brandedExports: true,
    claimPacketExport: true,
    clientPortal: true,
    workerAccounts: true,
    internalNotes: true,
    scheduling: true,
    teamMessages: true,
    analyticsDashboard: true,
    advancedAnalytics: false,
  },
  enterprise: {
    tagline: 'Business infrastructure — scale, analytics, and control',
    maxStaffUsers: -1,
    maxActiveProjects: -1,
    aiSummariesPerMonth: -1,
    maxUploadBytes: 50 * 1024 * 1024,
    basicUploadsOnly: false,
    exportWatermark: false,
    standardPdfExport: true,
    brandedExports: true,
    claimPacketExport: true,
    clientPortal: true,
    workerAccounts: true,
    internalNotes: true,
    scheduling: true,
    teamMessages: true,
    analyticsDashboard: true,
    advancedAnalytics: true,
  },
}

export function getPlanEntitlements(plan: BillingPlanId): PlanEntitlements {
  return PLAN_ENTITLEMENTS[plan]
}

/** Marketing bullets for plan picker and homepage */
export const PLAN_FEATURE_COPY: Record<
  BillingPlanId,
  { includes: string[]; excludes?: string[] }
> = {
  trial: {
    includes: [
      '1 user · 2 active projects',
      'Timeline, uploads & claim workflow',
      'Limited AI summaries',
      'Basic uploads (images & PDF)',
    ],
    excludes: [
      'Client portal',
      'Team collaboration',
      'Advanced exports (watermarked preview only)',
      'Analytics & automation',
    ],
  },
  starter: {
    includes: [
      '1 user · up to 25 projects',
      'Claim workflow, timeline & AI summaries',
      'Standard PDF export',
      'Mobile-friendly uploads',
    ],
    excludes: [
      'Worker & client accounts',
      'Internal notes & calendar',
      'Analytics dashboard',
      'Branded reports',
    ],
  },
  professional: {
    includes: [
      'Multiple workers & client portal',
      'Scheduling / calendar',
      'Internal notes & team messages',
      'Branded exports & claim packets',
      'Analytics dashboard',
    ],
  },
  enterprise: {
    includes: [
      'Unlimited workers & projects',
      'Advanced analytics',
      'Branded / white-label exports',
      'Priority support & onboarding',
      'Enterprise controls (SSO, API — contact us)',
    ],
  },
}

export function isUnlimited(limit: number) {
  return limit < 0
}

export function formatPlanLimit(limit: number, unit: string) {
  if (isUnlimited(limit)) return `Unlimited ${unit}`
  return `${limit} ${unit}`
}

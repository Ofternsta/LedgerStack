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
  standardPdfExport: boolean
  claimPacketExport: boolean
  clientPortal: boolean
  workerAccounts: boolean
  internalNotes: boolean
  scheduling: boolean
  teamMessages: boolean
  analyticsDashboard: boolean
  advancedAnalytics: boolean
  /** Completed ZIP backups retained per organization */
  maxOrganizationBackups: number
}

export const PLAN_ENTITLEMENTS: Record<BillingPlanId, PlanEntitlements> = {
  trial: {
    tagline: '7-day trial — experience the workflow, not the full business stack',
    maxStaffUsers: 1,
    maxActiveProjects: 2,
    aiSummariesPerMonth: 10,
    maxUploadBytes: 10 * 1024 * 1024,
    basicUploadsOnly: true,
    standardPdfExport: false,
    claimPacketExport: false,
    clientPortal: false,
    workerAccounts: false,
    internalNotes: false,
    scheduling: false,
    teamMessages: false,
    analyticsDashboard: false,
    advancedAnalytics: false,
    maxOrganizationBackups: 5,
  },
  starter: {
    tagline: 'Solo contractor — one admin account, no worker or client logins',
    maxStaffUsers: 1,
    maxActiveProjects: 10,
    aiSummariesPerMonth: 25,
    maxUploadBytes: 25 * 1024 * 1024,
    basicUploadsOnly: false,
    standardPdfExport: true,
    claimPacketExport: false,
    clientPortal: false,
    workerAccounts: false,
    internalNotes: false,
    scheduling: false,
    teamMessages: false,
    analyticsDashboard: false,
    advancedAnalytics: false,
    maxOrganizationBackups: 5,
  },
  professional: {
    tagline: 'Crew and clients on the same page — built for teams in the field',
    maxStaffUsers: 15,
    maxActiveProjects: 25,
    aiSummariesPerMonth: 50,
    maxUploadBytes: 50 * 1024 * 1024,
    basicUploadsOnly: false,
    standardPdfExport: true,
    claimPacketExport: true,
    clientPortal: true,
    workerAccounts: true,
    internalNotes: true,
    scheduling: true,
    teamMessages: true,
    analyticsDashboard: true,
    advancedAnalytics: false,
    maxOrganizationBackups: 15,
  },
  enterprise: {
    tagline: 'Business infrastructure — scale, analytics, and company control',
    maxStaffUsers: -1,
    maxActiveProjects: -1,
    aiSummariesPerMonth: -1,
    maxUploadBytes: 50 * 1024 * 1024,
    basicUploadsOnly: false,
    standardPdfExport: true,
    claimPacketExport: true,
    clientPortal: true,
    workerAccounts: true,
    internalNotes: true,
    scheduling: true,
    teamMessages: true,
    analyticsDashboard: true,
    advancedAnalytics: true,
    maxOrganizationBackups: 30,
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
      'Job timeline, uploads & status workflow',
      'Limited AI summaries & Project AI chat (10/month)',
      'Basic uploads — images & PDF only',
    ],
    excludes: [
      'Client portal, e-signatures & worker accounts',
      'Team chat, calendar & internal notes',
      'PDF export & project archives',
      'Analytics dashboard & automation',
    ],
  },
  starter: {
    includes: [
      'Admin account only — no worker or client accounts',
      '1 user · up to 10 active projects',
      'Automatic cloud backups — 5 retained per organization',
      '25 AI summaries & Project AI chat per month · full job workflow & timeline',
      'Standard PDF export · mobile uploads',
      '25 MB uploads (photos, PDFs & video)',
    ],
    excludes: [
      'Worker & client logins',
      'Internal notes, calendar & team messages',
      'Analytics dashboard',
      'Client portal, e-signatures & full job packets',
    ],
  },
  professional: {
    includes: [
      'Up to 15 team members · 25 projects',
      '50 AI summaries & Project AI chat per month',
      'Automatic cloud backups — 15 retained per organization',
      'Worker accounts, client portal & permissions',
      'Client e-signatures (SignWell) · Signed documents folder',
      'Calendar, internal notes & team messages',
      'Job packet exports, project archives & analytics',
    ],
  },
  enterprise: {
    includes: [
      'Unlimited workers & active projects',
      'Automatic cloud backups — 30 retained per organization',
      'Client e-signatures (SignWell) · Signed documents folder',
      'Advanced analytics & activity insights',
      'Unlimited AI summaries & Project AI chat',
      'Priority support & dedicated onboarding',
    ],
  },
}

/** Shown on Stripe Product records (Checkout line items). */
export const PLAN_STRIPE_DESCRIPTIONS: Record<
  Exclude<BillingPlanId, 'trial'>,
  string
> = {
  starter:
    'LedgerStack Starter ($20/mo) — For solo contractors: 1 admin user only (no worker or client accounts), up to 10 active projects, job timeline & workflow, 25 AI summaries and Project AI chat per month, standard PDF export, mobile field uploads, and automatic cloud backups (5 ZIPs retained per organization).',
  professional:
    'LedgerStack Professional ($70/mo) — Coordinate crew and clients: up to 15 workers, up to 25 active projects, client portal, SignWell e-signatures, project-scoped AI assistant, scheduling, internal notes, team messages, job packet exports, project archives, analytics dashboard, 50 AI summaries/month, and automatic cloud backups (15 ZIPs retained per organization).',
  enterprise:
    'LedgerStack Enterprise ($150/mo) — Company infrastructure: unlimited workers & projects, client portal, SignWell e-signatures, unlimited AI summaries and Project AI chat, advanced analytics, automatic cloud backups (30 ZIPs retained per organization), priority support, and onboarding.',
}

export function getPlanStripeDescription(
  plan: Exclude<BillingPlanId, 'trial'>
): string {
  return PLAN_STRIPE_DESCRIPTIONS[plan]
}

export function getPlanStripeProductName(
  plan: Exclude<BillingPlanId, 'trial'>,
  planLabel: string
): string {
  return `LedgerStack ${planLabel}`
}

export function isUnlimited(limit: number) {
  return limit < 0
}

export function formatPlanLimit(limit: number, unit: string) {
  if (isUnlimited(limit)) return `Unlimited ${unit}`
  return `${limit} ${unit}`
}

/** User-facing AI cap (never shows internal -1). */
export function formatAiSummariesPerMonth(limit: number): string {
  if (isUnlimited(limit)) return 'unlimited'
  return String(limit)
}

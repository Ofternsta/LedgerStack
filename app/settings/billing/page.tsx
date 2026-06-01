'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AppHeader } from '@/components/app-header'
import { AppFooter } from '@/components/app-footer'
import { AppNav } from '@/components/app-nav'
import Link from 'next/link'
import {
  PLAN_ENTITLEMENTS,
  PLAN_FEATURE_COPY,
} from '@/lib/plan-entitlements'
import type { BillingPlanId } from '@/lib/stripe-config'
import { loadUserAccess } from '@/lib/load-access'
import type { UserAccess } from '@/lib/roles'
import { supabase } from '@/lib/supabase'

type PlanInfo = {
  name: string
  price: number
  projects: number
}

type BillingData = {
  plans: Record<string, PlanInfo>
  subscription: {
    plan: string
    status: string
    current_period_end?: string | null
  } | null
  needsPlanSelection?: boolean
  trialAvailable?: boolean
  projectCount: number
  workerCount: number
  backupCount: number
  aiUsed: number
  aiLimit: number | null
  stripeConfigured: boolean
}

const PLAN_ORDER: BillingPlanId[] = [
  'trial',
  'starter',
  'professional',
  'enterprise',
]

function planRank(plan: BillingPlanId | string | null | undefined) {
  if (!plan) return -1
  return PLAN_ORDER.indexOf(plan as BillingPlanId)
}

function BillingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [data, setData] = useState<BillingData | null>(null)
  const [loading, setLoading] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    function loadBilling() {
      return fetch('/api/billing')
        .then((r) => r.json())
        .then((payload) => {
          if (payload.needsPlanSelection) {
            router.replace('/onboarding/subscription?renew=1')
            return
          }
          setData(payload)
        })
    }

    void loadBilling()

    if (searchParams.get('portal') && searchParams.get('updated')) {
      setMessage(
        'Billing updated in Stripe. Upgrades apply immediately; downgrades apply at your next renewal.'
      )
    }
    if (searchParams.get('success')) {
      setMessage('Subscription updated successfully.')
    }
    if (searchParams.get('canceled')) {
      setMessage('Checkout canceled. Select a plan to continue.')
    }
    if (searchParams.get('setup')) {
      setMessage('Choose a subscription plan to use LedgerStack.')
    }

    if (searchParams.get('portal') && searchParams.get('updated')) {
      void loadBilling()
    }
  }, [searchParams, router])

  async function selectPlan(plan: string) {
    if (!data?.stripeConfigured) {
      setMessage('Stripe is not configured. See STRIPE.md.')
      return
    }
    setLoading(plan)
    setMessage(null)

    const statusRes = await fetch('/api/auth/email-verification-status')
    const statusPayload = await statusRes.json().catch(() => ({}))
    if (statusRes.ok && !statusPayload.verified) {
      setMessage(
        'Verify your email before checkout. Check your inbox, or use Resend on the checkout page.'
      )
    }

    router.push(`/checkout?plan=${encodeURIComponent(plan)}`)
  }

  async function handlePlanAction(planId: BillingPlanId) {
    if (!data) return
    const currentPlan = (data.subscription?.plan || null) as BillingPlanId | null
    if (currentPlan === planId) return

    const currentRank = planRank(currentPlan)
    const targetRank = planRank(planId)
    const isDowngrade = currentRank >= 0 && targetRank < currentRank
    const hasActiveSubscription =
      data.subscription?.status === 'active' ||
      data.subscription?.status === 'trialing' ||
      data.subscription?.status === 'past_due'

    if (isDowngrade && currentPlan) {
      const target = PLAN_ENTITLEMENTS[planId]
      const warnings: string[] = []
      if (target.maxActiveProjects >= 0 && data.projectCount > target.maxActiveProjects) {
        warnings.push(
          `- Projects: ${data.projectCount} now vs ${target.maxActiveProjects} on ${planId}. After renewal you will be read-only until project count is reduced.`
        )
      }
      if (target.maxStaffUsers >= 0 && data.workerCount + 1 > target.maxStaffUsers) {
        warnings.push(
          `- Workers: ${data.workerCount + 1} staff users now (admin + approved workers) vs ${target.maxStaffUsers} allowed. After renewal workers lose project access until staff count is reduced.`
        )
      }
      if (target.maxOrganizationBackups >= 0 && data.backupCount > target.maxOrganizationBackups) {
        warnings.push(
          `- Backups: ${data.backupCount} retained vs ${target.maxOrganizationBackups} allowed. Older backups will be pruned to the new limit.`
        )
      }
      const msg = [
        `You are downgrading from ${currentPlan} to ${planId}.`,
        '',
        'You keep current-plan benefits until renewal.',
        'At renewal, lower-tier limits apply.',
        'AI monthly usage does not roll over; each month is capped at your active plan limit.',
        warnings.length ? `\nPotential limit issues:\n${warnings.join('\n')}` : '',
        '\nContinue to billing to confirm downgrade?',
      ].join('\n')
      if (!window.confirm(msg)) return
    }

    if (hasActiveSubscription && currentPlan) {
      setLoading(planId)
      await openPortal(planId)
      return
    }

    await selectPlan(planId)
  }

  async function openPortal(targetPlan?: BillingPlanId) {
    setLoading(targetPlan ?? 'portal')
    const res = await fetch('/api/billing/portal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(
        targetPlan ? { target_plan: targetPlan } : {}
      ),
    })
    const payload = await res.json().catch(() => ({}))
    if (payload.url) {
      window.location.href = payload.url as string
      return
    }
    setMessage(payload.error || 'Could not open billing portal')
    setLoading(null)
  }

  if (!data) {
    return <p className="text-muted">Loading billing…</p>
  }

  return (
    <>
      {message && (
        <p className="text-sm bg-green-50 border border-green-200 text-green-900 p-3 rounded-xl">
          {message}
        </p>
      )}

      {data.needsPlanSelection || !data.subscription ? (
        <p className="text-sm text-amber-900 bg-amber-50 border border-amber-100 p-3 rounded-xl">
          No active subscription yet. Select a plan below to continue.
        </p>
      ) : (
        <p className="text-sm text-muted">
          Current:{' '}
          <strong className="capitalize">{data.subscription.plan}</strong> (
          {data.subscription.status}) · {data.projectCount} project(s)
        </p>
      )}
      {!data.needsPlanSelection && data.subscription && (
        <p className="text-xs text-muted">
          Current usage: {data.projectCount} projects · {data.workerCount + 1} staff
          users · {data.backupCount} backups · AI {data.aiUsed}/
          {data.aiLimit ?? 'unlimited'} this month.
          {data.subscription.current_period_end && (
            <>
              {' '}
              · Renews{' '}
              {new Date(data.subscription.current_period_end).toLocaleDateString()}
            </>
          )}
        </p>
      )}

      {data.stripeConfigured &&
        (data.subscription?.status === 'active' ||
          data.subscription?.status === 'trialing' ||
          data.subscription?.status === 'past_due') && (
          <p className="text-xs text-muted">
            Upgrades bill a prorated amount now. Downgrades stay on your current plan
            until renewal, then lower limits apply.
          </p>
        )}

      {!data.stripeConfigured && (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 p-3 rounded-xl">
          Card payments are not configured. Add Stripe keys and price IDs — see{' '}
          <code className="text-[11px]">STRIPE.md</code>.
        </p>
      )}

      {data.stripeConfigured &&
        (data.subscription?.status === 'active' ||
          data.subscription?.status === 'trialing' ||
          data.subscription?.status === 'past_due') && (
          <button
            type="button"
            disabled={loading !== null}
            onClick={() => void openPortal()}
            className="w-full border border-border py-3 rounded-xl text-sm font-medium min-h-[48px] disabled:opacity-50"
          >
            {loading === 'portal' ? 'Opening…' : 'Manage card & billing'}
          </button>
        )}

      <div className="space-y-3">
        {(Object.entries(data.plans) as [BillingPlanId, PlanInfo][]).map(
          ([planId, plan]) => (
          <div
            key={planId}
            className={`border rounded-xl p-4 ${
              data.subscription?.plan === planId
                ? 'border-black bg-surface'
                : 'border-border'
            }`}
          >
            <div className="flex justify-between items-start gap-2">
              <div className="min-w-0 flex-1">
                <p className="font-bold">{plan.name}</p>
                <p className="text-xs text-muted mt-0.5">
                  {PLAN_ENTITLEMENTS[planId].tagline}
                </p>
                <p className="text-sm text-muted mt-1">
                  {plan.price === 0
                    ? 'Free trial'
                    : `$${plan.price}/month`}
                  {plan.projects > 0
                    ? ` · up to ${plan.projects} projects`
                    : ' · unlimited projects'}
                </p>
                <ul className="mt-2 space-y-0.5 text-xs text-muted">
                  {PLAN_FEATURE_COPY[planId].includes
                    .slice(0, planId === 'enterprise' ? 6 : 5)
                    .map((line) => (
                      <li key={line}>✓ {line}</li>
                    ))}
                </ul>
              </div>
              {data.subscription?.plan !== planId ? (
                <button
                  type="button"
                  disabled={loading !== null}
                  onClick={() => void handlePlanAction(planId)}
                  className="shrink-0 btn-primary text-[#052e16] text-sm px-4 py-2 rounded-lg min-h-[40px] disabled:opacity-50"
                >
                  {loading === planId
                    ? '…'
                    : planRank(planId) > planRank(data.subscription?.plan)
                      ? 'Upgrade'
                      : 'Downgrade'}
                </button>
              ) : (
                <span className="shrink-0 text-xs font-semibold border border-border rounded-lg px-2.5 py-2 text-muted">
                  Current plan
                </span>
              )}
            </div>
          </div>
        )
        )}
      </div>
    </>
  )
}

export default function BillingPage() {
  const router = useRouter()
  const [access, setAccess] = useState<UserAccess | null>(null)
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    loadUserAccess().then(({ access: a }) => {
      setAccess(a)
      if (a && !a.canManageBilling) router.replace('/projects')
    })
  }, [router])

  async function signOut() {
    setSigningOut(true)
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
    setSigningOut(false)
  }

  if (!access) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <p className="text-muted">Loading…</p>
      </div>
    )
  }

  return (
    <div className="min-h-dvh flex flex-col">
      <AppHeader
        title="Billing"
        subtitle="Subscription plans for your organization"
        backHref="/projects"
        backLabel="Projects"
        onSignOut={signOut}
        signingOut={signingOut}
      />

      <main className="flex-1 safe-x px-4 py-4 max-w-lg mx-auto w-full pb-8 safe-bottom space-y-6">
        <AppNav access={access} />
        <Suspense fallback={<p className="text-muted">Loading billing…</p>}>
          <BillingContent />
        </Suspense>

        {access.canArchiveProject && (
          <p className="text-sm text-muted">
            Manage automatic backups on the{' '}
            <Link href="/settings/backups" className="text-brand-bright font-medium">
              Backups
            </Link>{' '}
            page.
          </p>
        )}

        <AppFooter />
      </main>
    </div>
  )
}

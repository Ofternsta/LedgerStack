'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AppHeader } from '@/components/app-header'
import { AppFooter } from '@/components/app-footer'
import { AppNav } from '@/components/app-nav'
import { BackupSettingsPanel } from '@/components/backup-settings-panel'
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
  subscription: { plan: string; status: string } | null
  needsPlanSelection?: boolean
  trialAvailable?: boolean
  projectCount: number
  stripeConfigured: boolean
}

function BillingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [data, setData] = useState<BillingData | null>(null)
  const [loading, setLoading] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/billing')
      .then((r) => r.json())
      .then((payload) => {
        if (payload.needsPlanSelection) {
          router.replace('/onboarding/subscription?renew=1')
          return
        }
        setData(payload)
      })

    if (searchParams.get('success')) {
      setMessage('Subscription updated successfully.')
    }
    if (searchParams.get('canceled')) {
      setMessage('Checkout canceled. Select a plan to continue.')
    }
    if (searchParams.get('setup')) {
      setMessage('Choose a subscription plan to use LedgerStack.')
    }
  }, [searchParams])

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

  async function openPortal() {
    setLoading('portal')
    setMessage(null)
    const res = await fetch('/api/billing/portal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
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
            onClick={openPortal}
            className="w-full border border-border py-3 rounded-xl text-sm font-medium min-h-[48px] disabled:opacity-50"
          >
            {loading === 'portal' ? 'Opening…' : 'Manage card & billing (Stripe)'}
          </button>
        )}

      <div className="space-y-3">
        {Object.entries(data.plans).map(([key, plan]) => (
          <div
            key={key}
            className={`border rounded-xl p-4 ${
              data.subscription?.plan === key
                ? 'border-black bg-surface'
                : 'border-border'
            }`}
          >
            <div className="flex justify-between items-start gap-2">
              <div>
                <p className="font-bold">{plan.name}</p>
                <p className="text-sm text-muted mt-1">
                  {plan.price === 0
                    ? 'Free trial'
                    : `$${plan.price}/month`}
                  {plan.projects > 0
                    ? ` · up to ${plan.projects} projects`
                    : ' · unlimited projects'}
                </p>
              </div>
              {data.subscription?.plan !== key && (
                <button
                  type="button"
                  disabled={loading !== null}
                  onClick={() => selectPlan(key)}
                  className="shrink-0 btn-primary text-[#052e16] text-sm px-4 py-2 rounded-lg min-h-[40px] disabled:opacity-50"
                >
                  {loading === key ? '…' : key === 'trial' ? 'Verify card' : 'Pay with card'}
                </button>
              )}
            </div>
          </div>
        ))}
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
        <BackupSettingsPanel canManage={access.canArchiveProject} />
        <AppFooter />
      </main>
    </div>
  )
}

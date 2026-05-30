'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { StripeEmbeddedCheckout } from '@/components/stripe-embedded-checkout'
import { VerifyEmailBeforeCheckout } from '@/components/verify-email-before-checkout'
import { BrandLogo } from '@/components/brand-logo'
import { BILLING_PLANS, type BillingPlanId } from '@/lib/stripe-config'
import {
  loadAdminSignupDraft,
  type AdminSignupDraft,
} from '@/lib/signup-draft'

function registerPayloadFromDraft(draft: AdminSignupDraft, plan: BillingPlanId) {
  return {
    email: draft.email,
    password: draft.password,
    fullName: draft.fullName,
    organizationName: draft.organizationName,
    plan,
  }
}

async function registerPayloadForVerifiedEmail(
  email: string,
  plan: BillingPlanId
) {
  const verifyRes = await fetch(
    `/api/auth/email-verification-status?email=${encodeURIComponent(email)}`
  )
  const verify = await verifyRes.json().catch(() => ({}))
  if (!verifyRes.ok || !verify.verified) return null

  return { pendingSignup: true as const, email, plan }
}

function signupEmailFromBrowser(fallbackEmail: string | null) {
  return (
    fallbackEmail?.trim().toLowerCase() ||
    (typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('email')?.trim().toLowerCase()
      : null) ||
    null
  )
}

async function registerPayloadForSignup(
  plan: BillingPlanId,
  fallbackEmail: string | null
) {
  const draft = loadAdminSignupDraft()
  if (draft) return registerPayloadFromDraft(draft, plan)

  const email = signupEmailFromBrowser(fallbackEmail)

  if (email) {
    const pending = await registerPayloadForVerifiedEmail(email, plan)
    if (pending) return pending
  }

  const statusRes = await fetch('/api/auth/email-verification-status')
  const status = await statusRes.json().catch(() => ({}))
  if (statusRes.ok && status.verified && status.email) {
    const sessionEmail = String(status.email).trim().toLowerCase()
    const pending = await registerPayloadForVerifiedEmail(sessionEmail, plan)
    if (pending) return pending
  }

  return null
}

function CheckoutContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const planParam = searchParams.get('plan') as BillingPlanId | null
  const isRegister = searchParams.get('register') === '1'
  const isSignupFlow =
    isRegister || Boolean(typeof window !== 'undefined' && loadAdminSignupDraft())

  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [publishableKey, setPublishableKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [emailVerified, setEmailVerified] = useState(false)
  const [checkoutEmail, setCheckoutEmail] = useState<string | null>(null)

  const signupDraft = isRegister ? loadAdminSignupDraft() : null
  const draftPlan = signupDraft?.selectedPlan ?? null
  const resolvedPlan =
    planParam && planParam in BILLING_PLANS
      ? planParam
      : draftPlan && draftPlan in BILLING_PLANS
        ? draftPlan
        : null

  const plan = resolvedPlan
  const planInfo = plan ? BILLING_PLANS[plan] : null

  useEffect(() => {
    if (!isRegister || !draftPlan || planParam) return
    if (draftPlan in BILLING_PLANS) {
      router.replace(`/checkout?plan=${encodeURIComponent(draftPlan)}&register=1`)
    }
  }, [isRegister, draftPlan, planParam, router])

  const startStripeCheckout = useCallback(async () => {
    if (!plan) return

    const configRes = await fetch('/api/billing/config')
    const config = await configRes.json().catch(() => ({}))

    if (!config.stripeConfigured || !config.publishableKey) {
      setError(
        'Card payments are not configured yet. Ask your administrator to set up Stripe (STRIPE.md).'
      )
      setLoading(false)
      return
    }

    setPublishableKey(config.publishableKey)

    const body: Record<string, unknown> = {
      plan,
      embedded: true,
    }

    const registerPayload = await registerPayloadForSignup(
      plan,
      checkoutEmail ?? signupEmailFromBrowser(null)
    )
    if (registerPayload) {
      body.register = registerPayload
    } else if (isSignupFlow) {
      setError(
        checkoutEmail
          ? 'Could not continue signup checkout. Return to plan selection and try again, or contact support.'
          : 'Signup session was lost in this browser tab. Open the link from your email again, or start sign up from the beginning.'
      )
      setLoading(false)
      return
    }

    const res = await fetch('/api/billing/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const payload = await res.json().catch(() => ({}))

    if (res.status === 403 && payload.needsEmailVerification) {
      setEmailVerified(false)
      const registerEmail =
        typeof body.register === 'object' &&
        body.register &&
        'email' in body.register
          ? String((body.register as { email?: string }).email || '')
          : ''
      setCheckoutEmail(String(payload.email || registerEmail))
      setError(null)
      setLoading(false)
      return
    }

    if (!res.ok) {
      setError(payload.error || 'Could not start checkout')
      setLoading(false)
      return
    }

    if (payload.checkoutUrl && !payload.clientSecret) {
      window.location.href = payload.checkoutUrl as string
      return
    }

    if (!payload.clientSecret) {
      setError('Checkout session missing. Try again or contact support.')
      setLoading(false)
      return
    }

    setClientSecret(payload.clientSecret)
    setLoading(false)
  }, [plan, isSignupFlow, router, checkoutEmail])

  useEffect(() => {
    if (!plan) {
      setError('Select a plan first.')
      setLoading(false)
      return
    }

    async function init() {
      const draft = loadAdminSignupDraft()
      const statusRes = await fetch('/api/auth/email-verification-status')
      const status = await statusRes.json().catch(() => ({}))
      const sessionEmail =
        statusRes.ok && status.email
          ? String(status.email).trim().toLowerCase()
          : null

      let pendingSignup = false
      let pendingData: { plan?: string; pending?: boolean } = {}
      if (sessionEmail && status.verified) {
        const pendingRes = await fetch(
          `/api/auth/finish-signup?email=${encodeURIComponent(sessionEmail)}`
        )
        pendingData = await pendingRes.json().catch(() => ({}))
        pendingSignup = Boolean(pendingRes.ok && pendingData.pending)
      }

      const signupFlow = isSignupFlow || pendingSignup

      if (signupFlow) {
        const emailFromUrl = searchParams.get('email')?.trim().toLowerCase() || null
        const email =
          emailFromUrl ||
          draft?.email.trim().toLowerCase() ||
          sessionEmail ||
          null

        if (!email) {
          setError(
            'We could not find your signup email in this tab. Use Continue to payment from the email verification page, or return to sign up.'
          )
          setLoading(false)
          return
        }

        setCheckoutEmail(email)

        if (!isRegister && !planParam && pendingData?.plan) {
          const pendingPlan = pendingData.plan as BillingPlanId
          if (pendingPlan in BILLING_PLANS) {
            const params = new URLSearchParams({
              plan: pendingPlan,
              register: '1',
            })
            if (email) params.set('email', email)
            router.replace(`/checkout?${params.toString()}`)
            return
          }
        }

        const verifyRes = await fetch(
          `/api/auth/email-verification-status?email=${encodeURIComponent(email)}`
        )
        const verify = await verifyRes.json().catch(() => ({}))

        if (!verifyRes.ok || !verify.verified) {
          if (draft) {
            const accountRes = await fetch('/api/auth/register-admin-account', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: draft.email,
                password: draft.password,
                full_name: draft.fullName,
                organization_name: draft.organizationName,
                plan,
              }),
            })
            const accountPayload = await accountRes.json().catch(() => ({}))

            if (!accountRes.ok) {
              setError(accountPayload.error || 'Could not prepare account')
              setLoading(false)
              return
            }

            if (!accountPayload.emailVerified) {
              setEmailVerified(false)
              setLoading(false)
              return
            }
          } else {
            setEmailVerified(false)
            setLoading(false)
            return
          }
        }

        setEmailVerified(true)
        await startStripeCheckout()
        return
      }

      if (!statusRes.ok) {
        setError(status.error || 'Sign in to continue to checkout')
        setLoading(false)
        return
      }

      if (!status.verified) {
        setCheckoutEmail(status.email || null)
        setEmailVerified(false)
        setLoading(false)
        return
      }

      setEmailVerified(true)
      await startStripeCheckout()
    }

    void init()
  }, [plan, isSignupFlow, isRegister, planParam, router, searchParams, startStripeCheckout])

  const cancelHref = isSignupFlow
    ? '/onboarding/subscription?register=1'
    : '/settings/billing?canceled=1'

  const showVerifyGate = checkoutEmail && !emailVerified && !clientSecret

  return (
    <div className="min-h-dvh flex flex-col bg-background">
      <header className="border-b border-border safe-top px-4 py-4 max-w-lg mx-auto w-full">
        <BrandLogo href="/" size="sm" />
        <h1 className="text-xl font-bold text-white mt-4">Card payment</h1>
        {planInfo && (
          <p className="text-sm text-muted mt-1">
            {planInfo.name}
            {planInfo.price > 0
              ? ` — $${planInfo.price}/month`
              : ' — 7-day trial (card required, no charge today)'}
          </p>
        )}
      </header>

      <main className="flex-1 safe-x px-4 py-6 max-w-lg mx-auto w-full pb-8 space-y-4">
        {loading && !showVerifyGate && (
          <p className="text-sm text-muted-dim text-center py-12">
            Preparing secure checkout…
          </p>
        )}

        {showVerifyGate && (
          <VerifyEmailBeforeCheckout
            email={checkoutEmail}
            onVerified={() => {
              setEmailVerified(true)
              setLoading(true)
              void startStripeCheckout()
            }}
          />
        )}

        {error && (
          <div className="space-y-3">
            <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl p-3">
              {error}
            </p>
            <Link
              href={cancelHref}
              className="block text-center text-sm text-brand-bright font-medium min-h-[44px]"
            >
              Go back
            </Link>
          </div>
        )}

        {clientSecret && publishableKey && (
          <>
            <StripeEmbeddedCheckout
              clientSecret={clientSecret}
              publishableKey={publishableKey}
            />
            <p className="text-xs text-muted leading-relaxed">
              By completing payment you agree to our{' '}
              <Link href="/terms" className="text-brand-bright hover:underline">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link href="/privacy" className="text-brand-bright hover:underline">
                Privacy Policy
              </Link>
              . Subscriptions renew until canceled in billing settings.
            </p>
          </>
        )}

        {!loading && !error && !showVerifyGate && clientSecret && (
          <Link
            href={cancelHref}
            className="block text-center text-sm text-muted-dim py-2 min-h-[44px]"
          >
            Cancel
          </Link>
        )}
      </main>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh flex items-center justify-center">
          <p className="text-muted">Loading checkout…</p>
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  )
}

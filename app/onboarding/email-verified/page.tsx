'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { BrandLogo } from '@/components/brand-logo'
import { loadAdminSignupDraft } from '@/lib/signup-draft'
import { signupCheckoutPath } from '@/lib/auth-redirect'
import { BILLING_PLANS, type BillingPlanId } from '@/lib/stripe-config'

function EmailVerifiedContent() {
  const searchParams = useSearchParams()
  const planParam = searchParams.get('plan') as BillingPlanId | null
  const emailParam = searchParams.get('email')?.trim().toLowerCase() || null

  const plan =
    planParam && planParam in BILLING_PLANS ? planParam : ('starter' as BillingPlanId)
  const planInfo = BILLING_PLANS[plan]

  const [email, setEmail] = useState<string | null>(emailParam)
  const [verified, setVerified] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    async function resolve() {
      const draft = loadAdminSignupDraft()
      let resolvedEmail = emailParam || draft?.email.trim().toLowerCase() || null

      const statusRes = await fetch('/api/auth/email-verification-status')
      const status = await statusRes.json().catch(() => ({}))
      if (statusRes.ok && status.email) {
        resolvedEmail = String(status.email).trim().toLowerCase()
      }

      setEmail(resolvedEmail)

      if (resolvedEmail) {
        const verifyRes = await fetch(
          `/api/auth/email-verification-status?email=${encodeURIComponent(resolvedEmail)}`
        )
        const verify = await verifyRes.json().catch(() => ({}))
        setVerified(Boolean(verifyRes.ok && verify.verified))
      }

      setChecking(false)
    }

    void resolve()
  }, [emailParam])

  const checkoutHref = email
    ? signupCheckoutPath(plan, email)
    : signupCheckoutPath(plan)

  return (
    <div className="min-h-dvh flex flex-col bg-background">
      <header className="border-b border-border safe-top px-4 py-4 max-w-lg mx-auto w-full">
        <BrandLogo href="/" size="sm" />
      </header>

      <main className="flex-1 safe-x px-4 py-8 max-w-lg mx-auto w-full pb-8">
        <section className="border border-emerald-200 bg-emerald-50 rounded-2xl p-6 space-y-4 text-center">
          <p className="text-4xl" aria-hidden>
            ✓
          </p>
          <h1 className="text-xl font-bold text-emerald-950">Email verified</h1>
          {checking ? (
            <p className="text-sm text-emerald-900">Confirming your account…</p>
          ) : verified ? (
            <p className="text-sm text-emerald-900 leading-relaxed text-left">
              Your email is confirmed. Continue to enter card details for{' '}
              <strong>{planInfo.name}</strong>
              {planInfo.price > 0 ? ` ($${planInfo.price}/month)` : ''}.
            </p>
          ) : (
            <p className="text-sm text-emerald-900 leading-relaxed text-left">
              If you already clicked the email link, wait a moment and continue
              to payment. If checkout asks you to verify again, use{' '}
              <strong>I verified — check again</strong> on that page.
            </p>
          )}
          {email && (
            <p className="text-xs text-emerald-800/90 text-left">
              Account: <strong>{email}</strong>
            </p>
          )}
          <Link
            href={checkoutHref}
            className="block w-full btn-primary text-[#052e16] py-4 rounded-xl font-medium min-h-[52px] leading-[52px]"
          >
            Continue to payment
          </Link>
          {!email && (
            <p className="text-xs text-amber-900 text-left">
              Email not found in this browser. Return to your original signup tab,
              or{' '}
              <Link href="/login?signup=admin" className="underline font-medium">
                start sign up again
              </Link>
              .
            </p>
          )}
          <p className="text-xs text-emerald-800/80 text-left">
            You can sign in after checkout finishes and your workspace is ready.
          </p>
        </section>
      </main>
    </div>
  )
}

export default function EmailVerifiedPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh flex items-center justify-center">
          <p className="text-muted">Loading…</p>
        </div>
      }
    >
      <EmailVerifiedContent />
    </Suspense>
  )
}

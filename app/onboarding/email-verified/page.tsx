'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { BrandLogo } from '@/components/brand-logo'
import { BILLING_PLANS, type BillingPlanId } from '@/lib/stripe-config'

function EmailVerifiedContent() {
  const searchParams = useSearchParams()
  const planParam = searchParams.get('plan') as BillingPlanId | null
  const plan =
    planParam && planParam in BILLING_PLANS ? planParam : ('starter' as BillingPlanId)
  const planInfo = BILLING_PLANS[plan]

  const checkoutHref = `/checkout?plan=${encodeURIComponent(plan)}&register=1`

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
          <p className="text-sm text-emerald-900 leading-relaxed text-left">
            <strong>Go back to the browser tab</strong> where you were choosing your
            plan and entering payment. That page checks automatically and will show
            the card form once it sees your verified email.
          </p>
          <p className="text-sm text-emerald-800/90 text-left">
            If you closed that tab, you can continue payment here instead.
            {planInfo && (
              <>
                {' '}
                Selected plan: <strong>{planInfo.name}</strong>
                {planInfo.price > 0 ? ` ($${planInfo.price}/month)` : ''}.
              </>
            )}
          </p>
          <Link
            href={checkoutHref}
            className="block w-full btn-primary text-[#052e16] py-4 rounded-xl font-medium min-h-[52px] leading-[52px]"
          >
            Continue to payment
          </Link>
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

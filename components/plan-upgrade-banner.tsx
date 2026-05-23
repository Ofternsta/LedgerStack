'use client'

import Link from 'next/link'

type PlanUpgradeBannerProps = {
  message: string
  showBillingLink?: boolean
}

export function PlanUpgradeBanner({
  message,
  showBillingLink = true,
}: PlanUpgradeBannerProps) {
  return (
    <div className="text-sm text-amber-950 bg-amber-50 border border-amber-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
      <p className="leading-relaxed">{message}</p>
      {showBillingLink && (
        <Link
          href="/settings/billing"
          className="shrink-0 font-medium underline min-h-[44px] inline-flex items-center"
        >
          View plans
        </Link>
      )}
    </div>
  )
}

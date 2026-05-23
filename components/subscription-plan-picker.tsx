'use client'

import {
  BILLING_PLANS,
  type BillingPlanId,
} from '@/lib/stripe-config'
import {
  PLAN_ENTITLEMENTS,
  PLAN_FEATURE_COPY,
  formatPlanLimit,
} from '@/lib/plan-entitlements'

type SubscriptionPlanPickerProps = {
  selected: BillingPlanId | null
  onSelect: (plan: BillingPlanId) => void
  disabled?: boolean
  hideTrial?: boolean
}

export function SubscriptionPlanPicker({
  selected,
  onSelect,
  disabled = false,
  hideTrial = false,
}: SubscriptionPlanPickerProps) {
  const entries = (
    Object.entries(BILLING_PLANS) as [
      BillingPlanId,
      (typeof BILLING_PLANS)[BillingPlanId],
    ][]
  ).filter(([key]) => !(hideTrial && key === 'trial'))

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {entries.map(([key, plan]) => {
        const ent = PLAN_ENTITLEMENTS[key]
        const copy = PLAN_FEATURE_COPY[key]
        return (
          <label
            key={key}
            className={`flex gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${
              selected === key
                ? 'border-black bg-gray-50 ring-1 ring-black'
                : 'border-gray-200 bg-white hover:border-gray-300'
            } ${disabled ? 'opacity-60 pointer-events-none' : ''}`}
          >
            <input
              type="radio"
              name="subscriptionPlan"
              value={key}
              checked={selected === key}
              onChange={() => onSelect(key)}
              disabled={disabled}
              className="mt-1"
            />
            <span className="min-w-0">
              <span className="font-semibold block">{plan.name}</span>
              <span className="text-xs text-gray-500 block mt-0.5">
                {ent.tagline}
              </span>
              <span className="text-sm text-gray-600 mt-2 block">
                {plan.price === 0
                  ? `Free for ${'days' in plan ? plan.days : 7} days (card required)`
                  : `$${plan.price}/month`}
                {' · '}
                {formatPlanLimit(ent.maxActiveProjects, 'projects')}
              </span>
              <ul className="mt-2 space-y-1 text-xs text-gray-700">
                {copy.includes.slice(0, 4).map((line) => (
                  <li key={line}>✓ {line}</li>
                ))}
              </ul>
            </span>
          </label>
        )
      })}
    </div>
  )
}

import type { BillingPlanId } from '@/lib/stripe-config'
import type { RegisterAdminInput } from '@/lib/register-admin'

export type RegisterCheckoutPayload =
  | (RegisterAdminInput & { pendingSignup?: false })
  | {
      email: string
      plan: BillingPlanId
      pendingSignup: true
    }

/** Parse register body from checkout (camelCase or snake_case). */
export function parseRegisterCheckoutPayload(
  raw: unknown,
  plan: BillingPlanId
): RegisterCheckoutPayload | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>

  if (r.pendingSignup === true) {
    const email = String(r.email || '').trim()
    if (!email) return null
    return { email, plan, pendingSignup: true }
  }

  const email = String(r.email || '').trim()
  const password = String(r.password || '')
  const organizationName = String(
    r.organizationName ?? r.organization_name ?? ''
  ).trim()
  const fullNameRaw = r.fullName ?? r.full_name
  const fullName =
    typeof fullNameRaw === 'string' && fullNameRaw.trim()
      ? fullNameRaw.trim()
      : undefined

  return { email, password, fullName, organizationName, plan }
}

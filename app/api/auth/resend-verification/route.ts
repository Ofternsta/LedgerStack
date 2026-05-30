import { NextResponse } from 'next/server'
import { parseBillingPlan } from '@/lib/admin-billing-setup'
import { signupEmailVerifiedNextPath } from '@/lib/auth-redirect'
import { sendSignupConfirmationEmail } from '@/lib/auth-email'
import { createServiceClient } from '@/lib/supabase/service'
import { normalizeSignupEmail } from '@/lib/trial-eligibility'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const email = normalizeSignupEmail(String(body.email || ''))

    if (!email) {
      return NextResponse.json({ error: 'email is required' }, { status: 400 })
    }

    let plan = parseBillingPlan(body.plan)
    if (!plan) {
      const service = createServiceClient()
      const { data: pending } = await service
        .from('pending_admin_signups')
        .select('plan')
        .eq('email', email)
        .is('consumed_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      plan = parseBillingPlan(pending?.plan) ?? 'starter'
    }

    const result = await sendSignupConfirmationEmail(email, {
      nextPath: signupEmailVerifiedNextPath(plan, email),
    })
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error || 'Could not send verification email' },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Could not resend verification email'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

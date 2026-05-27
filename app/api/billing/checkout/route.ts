import { NextResponse } from 'next/server'
import { parseBillingPlan, setupAdminSubscription } from '@/lib/admin-billing-setup'
import {
  startPaidAdminSignupCheckout,
  startTrialAdminSignupCheckout,
  type RegisterAdminInput,
} from '@/lib/register-admin'
import { requireAuth } from '@/lib/require-auth'
import { isStripeConfigured } from '@/lib/stripe-config'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const planId = parseBillingPlan(body.plan)
    const embedded = Boolean(body.embedded)
    const uiMode = embedded ? 'embedded' : 'hosted'
    const register = body.register as RegisterAdminInput | undefined

    if (!planId) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    if (!isStripeConfigured()) {
      return NextResponse.json(
        {
          error:
            'Stripe is not configured. Add STRIPE_SECRET_KEY, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, and price IDs — see STRIPE.md.',
        },
        { status: 503 }
      )
    }

    if (register) {
      const input: RegisterAdminInput = {
        email: String(register.email || '').trim(),
        password: String(register.password || ''),
        fullName: register.fullName as string | undefined,
        organizationName: String(register.organizationName || '').trim(),
        plan: planId,
      }

      if (!input.email || !input.password || !input.organizationName) {
        return NextResponse.json(
          { error: 'Email, password, and company name are required.' },
          { status: 400 }
        )
      }

      const result =
        planId === 'trial'
          ? await startTrialAdminSignupCheckout(input, uiMode)
          : await startPaidAdminSignupCheckout(input, uiMode)

      if (result.error) {
        const status =
          result.error.includes('Stripe') || result.error.includes('configure')
            ? 503
            : 400
        return NextResponse.json({ error: result.error }, { status })
      }

      return NextResponse.json({
        checkoutUrl: result.checkoutUrl,
        clientSecret: result.clientSecret,
        sessionId: result.sessionId,
      })
    }

    const { supabase, user } = await requireAuth()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    }

    const { data: org } = await supabase
      .from('organizations')
      .select('id')
      .eq('admin_user_id', user.id)
      .maybeSingle()

    if (!org) {
      return NextResponse.json({ error: 'No organization' }, { status: 404 })
    }

    const { emailHasUsedTrial } = await import('@/lib/trial-eligibility')
    const trialAvailable = user.email
      ? !(await emailHasUsedTrial(user.email))
      : false

    const billing = await setupAdminSubscription(supabase, {
      organizationId: org.id,
      email: user.email,
      plan: planId,
      allowTrial: trialAvailable,
      uiMode,
      successPath:
        typeof body.success_path === 'string'
          ? body.success_path
          : '/settings/billing?success=1',
      cancelPath:
        typeof body.cancel_path === 'string'
          ? body.cancel_path
          : '/settings/billing?canceled=1',
    })

    if (billing.error) {
      const status =
        billing.error.includes('Stripe') || billing.error.includes('price')
          ? 503
          : 400
      return NextResponse.json({ error: billing.error }, { status })
    }

    return NextResponse.json({
      checkoutUrl: billing.checkoutUrl,
      clientSecret: billing.clientSecret,
      sessionId: billing.sessionId,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Checkout failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { requireAuth } from '@/lib/require-auth'
import {
  BILLING_PLANS,
  type BillingPlanId,
  billingAppUrl,
  isStripeConfigured,
  stripePriceIds,
} from '@/lib/stripe-config'

export async function GET() {
  try {
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
      .select('id, name')
      .eq('admin_user_id', user.id)
      .maybeSingle()

    if (!org) {
      return NextResponse.json({ error: 'No organization' }, { status: 404 })
    }

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('organization_id', org.id)
      .maybeSingle()

    const { count: projectCount } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', org.id)

    return NextResponse.json({
      plans: BILLING_PLANS,
      subscription: sub || {
        plan: 'trial',
        status: 'trialing',
        organization_id: org.id,
      },
      projectCount: projectCount ?? 0,
      stripeConfigured: isStripeConfigured(),
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Billing failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
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

    const { plan } = await req.json()
    if (!plan || !(plan in BILLING_PLANS)) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    const planId = plan as BillingPlanId

    const { data: org } = await supabase
      .from('organizations')
      .select('id')
      .eq('admin_user_id', user.id)
      .maybeSingle()

    if (!org) {
      return NextResponse.json({ error: 'No organization' }, { status: 404 })
    }

    const stripeKey = process.env.STRIPE_SECRET_KEY
    const priceMap = stripePriceIds()

    if (planId !== 'trial' && stripeKey && priceMap[planId]) {
      const stripe = new Stripe(stripeKey)

      const { data: existing } = await supabase
        .from('subscriptions')
        .select('stripe_customer_id')
        .eq('organization_id', org.id)
        .maybeSingle()

      let customerId = existing?.stripe_customer_id

      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: { organization_id: org.id },
        })
        customerId = customer.id
      }

      const appUrl = billingAppUrl()
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        line_items: [{ price: priceMap[planId]!, quantity: 1 }],
        success_url: `${appUrl}/settings/billing?success=1`,
        cancel_url: `${appUrl}/settings/billing?canceled=1`,
        metadata: { organization_id: org.id, plan: planId },
        subscription_data: {
          metadata: { organization_id: org.id, plan: planId },
        },
      })

      await supabase.from('subscriptions').upsert(
        {
          organization_id: org.id,
          plan: planId,
          status: 'trialing',
          stripe_customer_id: customerId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'organization_id' }
      )

      return NextResponse.json({ checkoutUrl: session.url })
    }

    if (planId !== 'trial' && !isStripeConfigured()) {
      return NextResponse.json(
        {
          error:
            'Stripe is not configured. Add STRIPE_SECRET_KEY and price IDs — see STRIPE.md.',
        },
        { status: 503 }
      )
    }

    await supabase.from('subscriptions').upsert(
      {
        organization_id: org.id,
        plan: planId,
        status: planId === 'trial' ? 'trialing' : 'active',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'organization_id' }
    )

    return NextResponse.json({ ok: true, plan: planId })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Billing update failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

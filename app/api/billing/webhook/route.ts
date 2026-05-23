import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import {
  handleCheckoutSessionCompleted,
  syncStripeSubscription,
  upsertSubscriptionFromStripe,
} from '@/lib/stripe-billing'
import type { BillingPlanId } from '@/lib/stripe-config'

export const runtime = 'nodejs'

const HANDLED_EVENTS = new Set([
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
])

export async function POST(req: Request) {
  const secretKey = process.env.STRIPE_SECRET_KEY
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!secretKey || !webhookSecret) {
    return NextResponse.json(
      { error: 'Stripe webhook is not configured' },
      { status: 503 }
    )
  }

  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  const stripe = new Stripe(secretKey)
  const body = await req.text()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Invalid signature'
    console.error('Stripe webhook signature error:', message)
    return NextResponse.json({ error: message }, { status: 400 })
  }

  if (!HANDLED_EVENTS.has(event.type)) {
    return NextResponse.json({ received: true })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(
          event.data.object as Stripe.Checkout.Session
        )
        break
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await syncStripeSubscription(event.data.object as Stripe.Subscription)
        break
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const organizationId = sub.metadata?.organization_id
        const customerId =
          typeof sub.customer === 'string' ? sub.customer : sub.customer.id

        if (organizationId) {
          await upsertSubscriptionFromStripe({
            organizationId,
            plan:
              (sub.metadata?.plan as BillingPlanId | undefined) || 'trial',
            status: 'canceled',
            stripeCustomerId: customerId,
            stripeSubscriptionId: null,
          })
        } else {
          await syncStripeSubscription(sub)
        }
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Webhook handler failed'
    console.error('Stripe webhook error:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

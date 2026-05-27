import { NextResponse } from 'next/server'
import {
  BILLING_PLANS,
  isStripeConfigured,
  stripePublishableKey,
} from '@/lib/stripe-config'

export async function GET() {
  return NextResponse.json({
    stripeConfigured: isStripeConfigured(),
    publishableKey: stripePublishableKey() ?? null,
    plans: BILLING_PLANS,
  })
}

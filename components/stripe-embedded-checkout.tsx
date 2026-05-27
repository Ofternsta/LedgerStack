'use client'

import { useEffect, useRef, useState } from 'react'
import { loadStripe } from '@stripe/stripe-js'

type StripeEmbeddedCheckoutProps = {
  clientSecret: string
  publishableKey: string
}

export function StripeEmbeddedCheckout({
  clientSecret,
  publishableKey,
}: StripeEmbeddedCheckoutProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let destroyed = false
    let checkout: { destroy: () => void } | null = null

    async function mount() {
      if (!containerRef.current) return

      try {
        const stripe = await loadStripe(publishableKey)
        if (!stripe || destroyed) return

        const embedded = await stripe.initEmbeddedCheckout({ clientSecret })
        checkout = embedded

        embedded.mount(containerRef.current)
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : 'Could not load card payment form'
        )
      } finally {
        if (!destroyed) setLoading(false)
      }
    }

    void mount()

    return () => {
      destroyed = true
      checkout?.destroy()
    }
  }, [clientSecret, publishableKey])

  return (
    <div className="space-y-3">
      {loading && (
        <p className="text-sm text-muted-dim text-center py-8">
          Loading secure card form…
        </p>
      )}
      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg p-3">
          {error}
        </p>
      )}
      <div
        ref={containerRef}
        className="min-h-[420px] rounded-xl overflow-hidden bg-white"
      />
      <p className="text-xs text-center text-muted-dim">
        Payments are processed securely by Stripe. We do not store your card
        number.
      </p>
    </div>
  )
}

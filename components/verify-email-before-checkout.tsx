'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

type VerifyEmailBeforeCheckoutProps = {
  email: string
  onVerified: () => void
}

export function VerifyEmailBeforeCheckout({
  email,
  onVerified,
}: VerifyEmailBeforeCheckoutProps) {
  const [message, setMessage] = useState<string | null>(
    'Verify your email before entering card details. Check your inbox for the confirmation link.'
  )
  const [resending, setResending] = useState(false)
  const [checking, setChecking] = useState(false)
  const continuedRef = useRef(false)

  const check = useCallback(async () => {
    if (continuedRef.current) return

    setChecking(true)
    const res = await fetch(
      `/api/auth/email-verification-status?email=${encodeURIComponent(email)}`
    )
    const payload = await res.json().catch(() => ({}))
    setChecking(false)

    if (!res.ok) {
      setMessage(
        payload.error ||
          'Could not check verification status. Refresh the page or try again in a moment.'
      )
      return
    }

    if (payload.verified) {
      continuedRef.current = true
      setMessage('Email confirmed — opening secure checkout…')
      onVerified()
      return
    }

    setMessage(
      'Still waiting for confirmation. Open the link in your email (check spam), then click check again.'
    )
  }, [email, onVerified])

  useEffect(() => {
    void check()
    const interval = setInterval(() => {
      void check()
    }, 5000)
    return () => clearInterval(interval)
  }, [check])

  async function resend() {
    setResending(true)
    setMessage(null)
    const res = await fetch('/api/auth/resend-verification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        plan: new URLSearchParams(window.location.search).get('plan'),
      }),
    })
    const payload = await res.json().catch(() => ({}))
    setResending(false)
    if (!res.ok) {
      setMessage(payload.error || 'Could not resend email')
      return
    }
    setMessage(
      'Verification email sent. Open the link, then return to this tab and click check again.'
    )
  }

  return (
    <section className="border border-amber-200 bg-amber-50 rounded-xl p-4 space-y-3">
      <h2 className="font-bold text-amber-950">Verify your email first</h2>
      <p className="text-sm text-amber-900 leading-relaxed">
        For security, you must confirm <strong>{email}</strong> before card
        checkout. We sent a link to that inbox (check spam). After you click
        it, come back to this tab to enter payment (you do not need to sign in
        on the page the email opens).
      </p>
      <p className="text-xs text-amber-800/90">
        Your login is created now; your company workspace is set up after payment
        completes.
      </p>
      {message && (
        <p className="text-sm text-amber-900 border border-amber-100 rounded-lg p-2 bg-white/60">
          {message}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={resending}
          onClick={resend}
          className="text-sm btn-primary text-[#052e16] px-4 py-2 rounded-lg min-h-[44px] disabled:opacity-50"
        >
          {resending ? 'Sending…' : 'Resend verification email'}
        </button>
        <button
          type="button"
          disabled={checking}
          onClick={check}
          className="text-sm border border-amber-300 px-4 py-2 rounded-lg min-h-[44px] text-amber-950 disabled:opacity-50"
        >
          {checking ? 'Checking…' : 'I verified — check again'}
        </button>
      </div>
    </section>
  )
}

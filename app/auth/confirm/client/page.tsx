'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { BrandLogo } from '@/components/brand-logo'
import { supabase } from '@/lib/supabase'
import { LedgerStackLoader } from '@/components/ledgerstack-loader'

function safeNextPath(next: string | null) {
  if (!next || !next.startsWith('/') || next.startsWith('//')) {
    return '/projects'
  }
  return next
}

function ConfirmEmailClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = safeNextPath(searchParams.get('next'))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function finish() {
      const hash = window.location.hash.startsWith('#')
        ? window.location.hash.slice(1)
        : ''
      const hashParams = new URLSearchParams(hash)
      const access_token = hashParams.get('access_token')
      const refresh_token = hashParams.get('refresh_token')

      if (access_token && refresh_token) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        })
        if (sessionError && !cancelled) {
          setError(sessionError.message)
          return
        }
        if (!cancelled) {
          window.history.replaceState(
            null,
            '',
            window.location.pathname + window.location.search
          )
          router.replace(next)
          router.refresh()
        }
        return
      }

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (session?.user) {
        if (!cancelled) {
          router.replace(next)
          router.refresh()
        }
        return
      }

      if (!cancelled) {
        setError(
          'We could not finish email verification in this browser. Open the confirmation link again, or return to checkout and click “I verified — check again”.'
        )
      }
    }

    void finish()
    return () => {
      cancelled = true
    }
  }, [next, router])

  return (
    <div className="min-h-dvh flex flex-col bg-background">
      <header className="border-b border-border safe-top px-4 py-4 max-w-lg mx-auto w-full">
        <BrandLogo href="/" size="sm" />
      </header>
      <main className="flex-1 safe-x px-4 py-12 max-w-lg mx-auto w-full text-center space-y-4">
        {error ? (
          <>
            <p className="text-sm text-red-400 bg-red-950/30 border border-red-900 rounded-xl p-4">
              {error}
            </p>
            <Link
              href="/login?signup=admin"
              className="inline-block text-sm text-brand-bright font-medium"
            >
              Back to sign up
            </Link>
          </>
        ) : (
          <>
            <LedgerStackLoader />
            <p className="text-sm text-muted">Finishing email verification…</p>
          </>
        )}
      </main>
    </div>
  )
}

export default function ConfirmEmailClientPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh flex items-center justify-center">
          <LedgerStackLoader />
        </div>
      }
    >
      <ConfirmEmailClient />
    </Suspense>
  )
}

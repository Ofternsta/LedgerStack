'use client'

import { FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [hasSession, setHasSession] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    void supabase.auth.getSession().then(({ data: { session } }) => {
      setHasSession(Boolean(session))
      setCheckingSession(false)
      if (!session) {
        setMessage(
          'This reset link is invalid or has expired. Request a new link from the sign-in page.'
        )
      }
    })
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setMessage(null)

    if (password.length < 6) {
      setMessage('Password must be at least 6 characters.')
      return
    }

    if (password !== confirmPassword) {
      setMessage('Passwords do not match.')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (error) {
      setMessage(error.message)
      return
    }

    await supabase.auth.signOut()
    router.push('/login?reset=1')
  }

  return (
    <div className="min-h-dvh flex flex-col safe-top safe-bottom">
      <main className="flex-1 flex flex-col justify-center safe-x px-4 py-8 max-w-md mx-auto w-full">
        <div className="mb-8 text-center">
          <p className="text-4xl mb-3" aria-hidden>
            🔐
          </p>
          <h1 className="text-2xl font-bold">Set a new password</h1>
          <p className="text-gray-600 mt-2 text-sm">
            Choose a password for your LedgerStack account
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="border border-gray-200 rounded-xl p-5 bg-gray-50 space-y-4"
        >
          {checkingSession ? (
            <p className="text-sm text-gray-600">Checking reset link…</p>
          ) : hasSession ? (
            <>
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  New password
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="border border-gray-300 rounded-xl p-3 w-full bg-white"
                  placeholder="At least 6 characters"
                />
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Confirm new password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="border border-gray-300 rounded-xl p-3 w-full bg-white"
                  placeholder="Re-enter password"
                />
              </div>
            </>
          ) : null}

          {message && (
            <p
              className={`text-sm leading-relaxed ${
                message.includes('updated') || message.includes('success')
                  ? 'text-green-800 bg-green-50 border border-green-100 rounded-lg p-3'
                  : 'text-red-700 bg-red-50 border border-red-100 rounded-lg p-3'
              }`}
            >
              {message}
            </p>
          )}

          {hasSession && !checkingSession && (
            <button
              type="submit"
              disabled={loading || !password || !confirmPassword}
              className="w-full bg-black text-white py-4 rounded-xl font-medium disabled:opacity-50 min-h-[52px]"
            >
              {loading ? 'Saving…' : 'Update password'}
            </button>
          )}

          <Link
            href="/login"
            className="block text-center text-sm text-gray-600 underline min-h-[44px] leading-[44px]"
          >
            Back to sign in
          </Link>
        </form>
      </main>
    </div>
  )
}

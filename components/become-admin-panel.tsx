'use client'

import { useState } from 'react'

type BecomeAdminPanelProps = {
  onSuccess: () => void
}

export function BecomeAdminPanel({ onSuccess }: BecomeAdminPanelProps) {
  const [open, setOpen] = useState(false)
  const [orgName, setOrgName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [inviteCode, setInviteCode] = useState<string | null>(null)

  async function submit() {
    setLoading(true)
    setError(null)
    setInviteCode(null)

    const res = await fetch('/api/account/become-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        organization_name: orgName.trim() || 'My Company',
      }),
    })

    const payload = await res.json().catch(() => ({}))

    if (!res.ok) {
      setError(
        payload.error ||
          'Could not switch to admin. Run supabase/account-role-fix.sql in Supabase if delete failed.'
      )
      setLoading(false)
      return
    }

    setInviteCode(payload.invite_code || null)
    setLoading(false)
    onSuccess()
  }

  if (inviteCode) {
    return (
      <div className="border border-green-200 bg-green-50 rounded-xl p-4 text-left space-y-2">
        <p className="font-bold text-green-900">You are now the company admin</p>
        <p className="text-sm text-green-800">
          Worker invite code for your team:
        </p>
        <p className="text-xl font-bold tracking-[0.2em] text-center bg-white rounded-lg py-2">
          {inviteCode}
        </p>
      </div>
    )
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm text-blue-700 font-medium underline min-h-[44px]"
      >
        I should be the company admin (wrong account type)
      </button>
    )
  }

  return (
    <div className="border border-blue-200 bg-blue-50 rounded-xl p-4 text-left space-y-3 w-full">
      <p className="font-bold text-blue-900">Set up as company admin</p>
      <p className="text-sm text-blue-800 leading-relaxed">
        This removes your worker request and creates your own organization. Use
        this if you signed up as a worker but you own the company.
      </p>
      <input
        type="text"
        value={orgName}
        onChange={(e) => setOrgName(e.target.value)}
        placeholder="Company name"
        className="border border-gray-300 rounded-xl p-3 w-full bg-white"
      />
      {error && <p className="text-sm text-red-700">{error}</p>}
      <div className="flex flex-col gap-2">
        <button
          type="button"
          disabled={loading}
          onClick={submit}
          className="bg-black text-white py-3 rounded-xl font-medium min-h-[48px] disabled:opacity-50"
        >
          {loading ? 'Setting up…' : 'Become admin'}
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => setOpen(false)}
          className="border border-gray-300 py-2 rounded-xl text-sm min-h-[44px]"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { ClientSharedFilesEditor } from '@/components/client-shared-files-editor'

type AccessRow = {
  id: string
  client_email: string
  status: string
  approved_at: string | null
}

export function ProjectClientPanel({ projectId }: { projectId: string }) {
  const [email, setEmail] = useState('')
  const [rows, setRows] = useState<AccessRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [expandedAccessId, setExpandedAccessId] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const res = await fetch(`/api/project-access?project_id=${projectId}`)
    const payload = await res.json().catch(() => ({}))
    if (res.ok) setRows(payload.access || [])
    setLoading(false)
  }

  async function grantAccess(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setSaving(true)
    setMessage(null)

    const res = await fetch('/api/project-access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_id: projectId,
        client_email: email.trim(),
      }),
    })
    const payload = await res.json().catch(() => ({}))

    if (!res.ok) {
      setMessage(payload.error || 'Could not grant access')
      setSaving(false)
      return
    } else {
      setMessage(`Access granted to ${email.trim().toLowerCase()}`)
      setEmail('')
      await load()
    }
    setSaving(false)
  }

  async function revoke(accessId: string) {
    setMessage(null)
    const res = await fetch(`/api/project-access?access_id=${accessId}`, {
      method: 'DELETE',
    })
    const payload = await res.json().catch(() => ({}))

    if (!res.ok) {
      setMessage(payload.error || 'Could not revoke access')
      return
    }

    if (expandedAccessId === accessId) {
      setExpandedAccessId(null)
    }
    setMessage('Client access revoked.')
    await load()
  }

  function toggleClientFiles(accessId: string) {
    setExpandedAccessId((current) => (current === accessId ? null : accessId))
  }

  useEffect(() => {
    load()
  }, [projectId])

  return (
    <section className="border border-border rounded-xl p-4 bg-surface-elevated space-y-3">
      <h2 className="font-bold text-lg">Client access</h2>
      <p className="text-sm text-muted leading-relaxed">
        Clients must sign up as <strong>Client</strong> and use this email. Click a
        client&apos;s name to choose which files they can view in each category.
      </p>

      <form onSubmit={grantAccess} className="flex flex-col sm:flex-row gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="client@email.com"
          className="border border-border rounded-xl p-3 flex-1"
        />
        <button
          type="submit"
          disabled={saving}
          className="btn-primary text-[#052e16] px-4 py-3 rounded-xl font-medium min-h-[48px] disabled:opacity-50 shrink-0"
        >
          {saving ? '…' : 'Grant access'}
        </button>
      </form>

      {message && (
        <p
          className={`text-sm rounded-lg px-3 py-2 ${
            message.toLowerCase().includes('could not') ||
            message.toLowerCase().includes('error')
              ? 'text-red-800 bg-red-50 border border-red-100'
              : 'text-green-800 bg-green-50 border border-green-100'
          }`}
        >
          {message}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-muted-dim">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-dim">No clients have access yet.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => {
            const isExpanded = expandedAccessId === r.id

            return (
              <li
                key={r.id}
                className="border border-gray-100 rounded-lg text-sm overflow-hidden"
              >
                <div className="flex items-center justify-between gap-2 p-3">
                  <button
                    type="button"
                    onClick={() => toggleClientFiles(r.id)}
                    className="min-w-0 flex-1 text-left min-h-[44px]"
                  >
                    <span className="break-all font-medium text-foreground">
                      {r.client_email}
                    </span>
                    <span className="text-green-700 ml-2 text-xs font-medium capitalize">
                      {r.status}
                    </span>
                    <span className="block text-xs text-muted-dim mt-0.5">
                      {isExpanded
                        ? 'Hide shared files'
                        : 'Choose shared files →'}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => revoke(r.id)}
                    className="text-red-600 font-medium min-h-[44px] px-2 shrink-0"
                  >
                    Revoke
                  </button>
                </div>

                {isExpanded && r.status === 'approved' && (
                  <div className="px-3 pb-3">
                    <ClientSharedFilesEditor
                      projectId={projectId}
                      accessId={r.id}
                      clientEmail={r.client_email}
                    />
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

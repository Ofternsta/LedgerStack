'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import type { SignatureRequestRow } from '@/lib/signature-request-types'

type Props = {
  projectId: string
}

export function AdminSignatureRequestsPanel({ projectId }: Props) {
  const [requests, setRequests] = useState<SignatureRequestRow[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(
      `/api/signature-requests?project_id=${encodeURIComponent(projectId)}`
    )
    const payload = await res.json().catch(() => ({}))
    if (res.ok) {
      setRequests(payload.requests || [])
    } else {
      setRequests([])
    }
    setLoading(false)
  }, [projectId])

  useEffect(() => {
    void load()
  }, [load])

  const incomplete = requests.filter((r) =>
    ['pending', 'viewed'].includes(r.status)
  )

  useEffect(() => {
    if (!incomplete.length) return
    const timer = window.setInterval(() => {
      void load()
    }, 20000)
    return () => window.clearInterval(timer)
  }, [incomplete.length, load])

  if (loading && !requests.length) {
    return null
  }

  if (!incomplete.length) {
    return null
  }

  return (
    <section
      id="signature-requests-incomplete"
      className="border border-amber-200/80 rounded-xl p-4 bg-amber-50/50 space-y-3"
    >
      <div>
        <h2 className="font-bold text-lg text-amber-950">
          Signature requests incomplete
        </h2>
        <p className="text-sm text-amber-900/80 mt-1">
          Waiting for the client to sign. Completed copies appear under Signed
          documents.
        </p>
      </div>

      <ul className="space-y-2">
        {incomplete.map((r) => (
          <li
            key={r.id}
            className="border border-amber-200 rounded-xl p-3 bg-white/80 flex flex-wrap items-center justify-between gap-2"
          >
            <div className="min-w-0">
              <p className="font-medium text-sm truncate">{r.source_file_name}</p>
              <p className="text-xs text-muted">
                {r.client_email}
                {r.requested_at
                  ? ` · requested ${new Date(r.requested_at).toLocaleDateString()}`
                  : ''}
              </p>
              <p className="text-xs text-muted capitalize">{r.status}</p>
            </div>
            <span className="text-xs font-medium text-amber-800 bg-amber-100 px-2 py-1 rounded-lg">
              Awaiting signature
            </span>
          </li>
        ))}
      </ul>

      <p className="text-xs text-muted">
        Manage requests from{' '}
        <Link
          href="/settings/organization"
          className="text-brand-bright font-medium hover:underline"
        >
          Organization settings
        </Link>{' '}
        → project client access.
      </p>
    </section>
  )
}

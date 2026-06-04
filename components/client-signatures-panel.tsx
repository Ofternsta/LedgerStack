'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import type { SignatureRequestRow } from '@/lib/signature-request-types'

type Props = {
  projectId?: string
  compact?: boolean
}

export function ClientSignaturesPanel({ projectId, compact }: Props) {
  const [requests, setRequests] = useState<SignatureRequestRow[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ mine: '1' })
    if (projectId) params.set('project_id', projectId)
    const res = await fetch(`/api/signature-requests?${params}`)
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

  const pending = requests.filter((r) =>
    ['pending', 'viewed'].includes(r.status)
  )
  const signed = requests.filter((r) => r.status === 'signed')

  if (loading && !requests.length) {
    return compact ? null : (
      <p className="text-sm text-muted-dim">Loading signature requests…</p>
    )
  }

  if (!pending.length && !signed.length) {
    return null
  }

  return (
    <section
      className={
        compact
          ? 'space-y-3'
          : 'border border-border rounded-xl p-4 bg-surface-elevated space-y-4'
      }
    >
      {!compact && (
        <div>
          <h2 className="font-bold text-lg">Signatures</h2>
          <p className="text-sm text-muted mt-1">
            Documents your contractor asked you to sign electronically.
          </p>
        </div>
      )}

      {pending.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-amber-800">
            Needs your signature
          </h3>
          <ul className="space-y-2">
            {pending.map((r) => (
              <li
                key={r.id}
                className="border border-amber-200/80 bg-amber-50/80 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">
                    {r.source_file_name}
                  </p>
                  <p className="text-xs text-muted capitalize">{r.status}</p>
                </div>
                <Link
                  href={`/project/${r.project_id}/sign/${r.id}`}
                  className="shrink-0 btn-primary text-sm px-4 py-2 rounded-lg min-h-[40px]"
                >
                  Sign now
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {signed.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">Signed documents</h3>
          <ul className="space-y-2">
            {signed.map((r) => (
              <li
                key={r.id}
                className="border border-border rounded-xl p-3 flex flex-wrap items-center justify-between gap-2 bg-surface"
              >
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">
                    {r.source_file_name}
                  </p>
                  <p className="text-xs text-muted">
                    Signed
                    {r.completed_at
                      ? ` · ${new Date(r.completed_at).toLocaleDateString()}`
                      : ''}
                  </p>
                </div>
                <Link
                  href={`/project/${r.project_id}`}
                  className="shrink-0 text-sm text-brand-bright font-medium min-h-[40px] inline-flex items-center"
                >
                  View project
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

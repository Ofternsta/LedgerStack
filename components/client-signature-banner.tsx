'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

export function ClientSignatureBanner() {
  const [pending, setPending] = useState<{
    count: number
    first?: { project_id: string; id: string; source_file_name: string }
  } | null>(null)

  useEffect(() => {
    fetch('/api/signature-requests?mine=1')
      .then((r) => r.json())
      .then((d) => {
        const requests = (d.requests || []) as Array<{
          id: string
          project_id: string
          source_file_name: string
          status: string
        }>
        const open = requests.filter((r) =>
          ['pending', 'viewed'].includes(r.status)
        )
        if (!open.length) {
          setPending(null)
          return
        }
        setPending({
          count: open.length,
          first: open[0],
        })
      })
      .catch(() => setPending(null))
  }, [])

  if (!pending?.count || !pending.first) return null

  return (
    <p className="text-sm bg-amber-50 border border-amber-200 text-amber-950 rounded-xl p-3">
      You have{' '}
      <strong>
        {pending.count} document{pending.count === 1 ? '' : 's'}
      </strong>{' '}
      waiting for your signature.{' '}
      <Link
        href={`/project/${pending.first.project_id}/sign/${pending.first.id}`}
        className="text-brand-bright font-semibold hover:underline"
      >
        Sign {pending.first.source_file_name}
      </Link>
    </p>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { formatProjectActiveDuration } from '@/lib/format-project-active-duration'

type Props = {
  createdAt?: string | null
}

/** Live project age badge for project list cards (updates hourly). */
export function ProjectActiveDurationBadge({ createdAt }: Props) {
  const [label, setLabel] = useState(() =>
    formatProjectActiveDuration(createdAt)
  )

  useEffect(() => {
    function refresh() {
      setLabel(formatProjectActiveDuration(createdAt))
    }
    refresh()
    const id = window.setInterval(refresh, 60 * 60 * 1000)
    return () => window.clearInterval(id)
  }, [createdAt])

  if (!label) return null

  return (
    <span
      className="absolute top-3 right-3 text-xs font-semibold text-muted-dim tabular-nums pointer-events-none"
      aria-label={`Project active ${label}`}
    >
      {label}
    </span>
  )
}

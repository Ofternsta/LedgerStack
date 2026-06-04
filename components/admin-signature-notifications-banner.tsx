'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

type Notification = {
  id: string
  type: string
  title: string
  body: string
  href: string | null
  read_at: string | null
}

export function AdminSignatureNotificationsBanner() {
  const [items, setItems] = useState<Notification[]>([])

  useEffect(() => {
    fetch('/api/notifications')
      .then((r) => r.json())
      .then((d) => {
        const unread = ((d.notifications || []) as Notification[]).filter(
          (n) => !n.read_at && n.type === 'signature_completed'
        )
        setItems(unread)
      })
      .catch(() => setItems([]))
  }, [])

  if (!items.length) return null

  async function dismiss(id: string) {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [id] }),
    })
    setItems((prev) => prev.filter((n) => n.id !== id))
  }

  return (
    <div className="space-y-2">
      {items.map((n) => (
        <div
          key={n.id}
          className="text-sm bg-emerald-50 border border-emerald-200 text-emerald-950 rounded-xl p-3 flex flex-wrap items-start justify-between gap-2"
        >
          <p>
            <strong>{n.title}.</strong> {n.body}{' '}
            {n.href ? (
              <Link href={n.href} className="text-brand-bright font-semibold hover:underline">
                View project
              </Link>
            ) : null}
          </p>
          <button
            type="button"
            onClick={() => void dismiss(n.id)}
            className="text-xs text-muted hover:text-foreground shrink-0"
          >
            Dismiss
          </button>
        </div>
      ))}
    </div>
  )
}

'use client'

import Link from 'next/link'
import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import type { UserAccess } from '@/lib/roles'

const MAX_PX = 12
const MIN_PX = 8

const linkClass =
  'text-muted hover:text-brand-bright transition-colors whitespace-nowrap shrink-0'

type MobileLegalFooterNavProps = {
  access: UserAccess
}

/** Privacy, Terms, and Billing on one row — font scales down on narrow phones. */
export function MobileLegalFooterNav({ access }: MobileLegalFooterNavProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const rowRef = useRef<HTMLElement>(null)
  const [fontSize, setFontSize] = useState(MAX_PX)

  const fitRow = useCallback(() => {
    const container = containerRef.current
    const row = rowRef.current
    if (!container || !row) return

    let size = MAX_PX
    row.style.fontSize = `${size}px`

    let guard = 0
    while (size > MIN_PX && row.scrollWidth > container.clientWidth && guard < 40) {
      guard += 1
      size -= 0.5
      row.style.fontSize = `${size}px`
    }

    setFontSize(size)
  }, [access.canManageBilling])

  useLayoutEffect(() => {
    fitRow()

    const container = containerRef.current
    if (!container || typeof ResizeObserver === 'undefined') return

    const observer = new ResizeObserver(() => fitRow())
    observer.observe(container)
    return () => observer.disconnect()
  }, [fitRow, access.canManageBilling])

  return (
    <div ref={containerRef} className="w-full min-w-0 max-w-full">
      <nav
        ref={rowRef}
        className="flex flex-nowrap items-center justify-center gap-x-1.5 w-full"
        style={{ fontSize: `${fontSize}px` }}
        aria-label="Legal and billing"
      >
        <Link href="/privacy" className={linkClass}>
          Privacy Policy
        </Link>
        <span className="text-muted-dim shrink-0" aria-hidden>
          ·
        </span>
        <Link href="/terms" className={linkClass}>
          Terms of Service
        </Link>
        {access.canManageBilling && (
          <>
            <span className="text-muted-dim shrink-0" aria-hidden>
              ·
            </span>
            <Link href="/settings/billing" className={linkClass}>
              Billing
            </Link>
          </>
        )}
      </nav>
    </div>
  )
}

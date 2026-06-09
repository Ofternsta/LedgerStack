'use client'

import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { accessShellSubtitle } from '@/lib/access-role-label'
import type { UserAccess } from '@/lib/roles'
import { AutoFitHeaderSubtitle } from '@/components/auto-fit-header-subtitle'

const MD_MIN_PX = 768
const BREATHING_ROOM_IN = 1
const MIN_LEFT_PX = 128

const headerUtilityLinkClass =
  'text-sm text-muted hover:text-brand-bright transition-colors whitespace-nowrap'

type AppShellHeaderProps = {
  access: UserAccess
}

/** Centers legal/billing links on screen; shrinks subtitle block to keep 1in clearance. */
export function AppShellHeader({ access }: AppShellHeaderProps) {
  const headerRowRef = useRef<HTMLDivElement>(null)
  const navRef = useRef<HTMLElement>(null)
  const [leftMaxWidth, setLeftMaxWidth] = useState<number | null>(null)

  const updateLeftMaxWidth = useCallback(() => {
    const header = headerRowRef.current
    const nav = navRef.current
    if (!header || !nav) return

    if (window.innerWidth < MD_MIN_PX) {
      setLeftMaxWidth(null)
      return
    }

    const headerWidth = header.clientWidth
    const navWidth = nav.offsetWidth
    const breathingRoomPx = BREATHING_ROOM_IN * 96
    const available = (headerWidth - navWidth) / 2 - breathingRoomPx
    setLeftMaxWidth(Math.max(MIN_LEFT_PX, available))
  }, [access.canManageBilling])

  useLayoutEffect(() => {
    updateLeftMaxWidth()

    const header = headerRowRef.current
    const nav = navRef.current
    if (!header) return

    const observer =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => updateLeftMaxWidth())
        : null

    observer?.observe(header)
    if (nav) observer?.observe(nav)

    window.addEventListener('resize', updateLeftMaxWidth)
    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', updateLeftMaxWidth)
    }
  }, [updateLeftMaxWidth])

  return (
    <header className="border-b border-border bg-background safe-top shrink-0 w-full">
      <div
        ref={headerRowRef}
        className="safe-x px-4 sm:px-6 lg:px-8 py-3 w-full relative flex items-center"
      >
        <div
          className="min-w-0 flex-1 md:flex-none md:shrink"
          style={
            leftMaxWidth !== null
              ? { maxWidth: `${leftMaxWidth}px` }
              : undefined
          }
        >
          <h1 className="text-xl sm:text-2xl font-bold leading-tight text-[var(--header-title)]">
            LedgerStack
          </h1>
          <AutoFitHeaderSubtitle text={accessShellSubtitle(access)} />
        </div>
        <nav
          ref={navRef}
          className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 items-center gap-x-4 lg:gap-x-6 pointer-events-auto"
          aria-label="Legal and billing"
        >
          <Link href="/privacy" className={headerUtilityLinkClass}>
            Privacy Policy
          </Link>
          <Link href="/terms" className={headerUtilityLinkClass}>
            Terms of Service
          </Link>
          {access.canManageBilling && (
            <Link href="/settings/billing" className={headerUtilityLinkClass}>
              Billing
            </Link>
          )}
        </nav>
      </div>
    </header>
  )
}

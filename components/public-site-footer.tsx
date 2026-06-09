'use client'

import Link from 'next/link'
import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { SupportLink } from '@/components/support-link'

const MAX_PX = 12
const MIN_PX = 8

const FOOTER_LINKS = [
  { href: '/how-to', label: 'How-to guide' },
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/terms', label: 'Terms of Service' },
  { href: '/', label: 'Home' },
] as const

const linkClass =
  'text-muted hover:text-brand-bright transition-colors whitespace-nowrap shrink-0'

type PublicSiteFooterProps = {
  /** Include Home in the link row (default true). */
  showHome?: boolean
  className?: string
}

function PublicFooterNav({ showHome }: { showHome: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const rowRef = useRef<HTMLElement>(null)
  const [fontSize, setFontSize] = useState(MAX_PX)

  const links = showHome
    ? FOOTER_LINKS
    : FOOTER_LINKS.filter((link) => link.href !== '/')

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
  }, [showHome])

  useLayoutEffect(() => {
    fitRow()

    const container = containerRef.current
    if (!container || typeof ResizeObserver === 'undefined') return

    const observer = new ResizeObserver(() => fitRow())
    observer.observe(container)
    return () => observer.disconnect()
  }, [fitRow, showHome])

  return (
    <div ref={containerRef} className="w-full min-w-0 max-w-full">
      <nav
        ref={rowRef}
        className="flex flex-nowrap items-center justify-center gap-x-1.5 w-full"
        style={{ fontSize: `${fontSize}px` }}
        aria-label="Site links"
      >
        {links.map((link, index) => (
          <span key={link.href} className="contents">
            {index > 0 && (
              <span className="text-muted-dim shrink-0" aria-hidden>
                ·
              </span>
            )}
            <Link href={link.href} className={linkClass}>
              {link.label}
            </Link>
          </span>
        ))}
      </nav>
    </div>
  )
}

/** Footer for public/marketing pages — matches app mobile footer pattern (no Billing). */
export function PublicSiteFooter({
  showHome = true,
  className = '',
}: PublicSiteFooterProps) {
  return (
    <footer
      className={`border-t border-border bg-background safe-bottom shrink-0 px-2 pt-4 pb-4 text-center text-sm text-muted space-y-2 w-full ${className}`}
    >
      <p>
        Questions? <SupportLink />
      </p>
      <PublicFooterNav showHome={showHome} />
    </footer>
  )
}

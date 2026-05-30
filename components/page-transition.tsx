'use client'

import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

const SKIP_PREFIXES = ['/login', '/auth', '/checkout', '/onboarding']
const SKIP_EXACT = new Set(['/'])

function shouldSkipTransition(pathname: string) {
  if (SKIP_EXACT.has(pathname)) return true
  return SKIP_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname()

  if (shouldSkipTransition(pathname)) {
    return <>{children}</>
  }

  return (
    <div key={pathname} className="app-page-transition flex flex-col flex-1 min-h-0">
      {children}
    </div>
  )
}

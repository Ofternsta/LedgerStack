'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { accessShellSubtitle } from '@/lib/access-role-label'
import type { UserAccess } from '@/lib/roles'
import { AppSidebar } from '@/components/app-sidebar'

const headerUtilityLinkClass =
  'text-sm text-muted hover:text-brand-bright transition-colors whitespace-nowrap'

type AppShellProps = {
  access: UserAccess
  onSignOut: () => void
  signingOut?: boolean
  children: ReactNode
  mainClassName?: string
}

export function AppShell({
  access,
  onSignOut,
  signingOut,
  children,
  mainClassName = 'flex-1 safe-x px-4 sm:px-6 lg:px-8 py-4 w-full max-w-[1600px] pb-8 safe-bottom',
}: AppShellProps) {
  return (
    <div className="min-h-dvh flex flex-col">
      <header className="border-b border-border bg-background safe-top shrink-0 w-full">
        <div className="safe-x px-4 sm:px-6 lg:px-8 py-3 w-full flex items-center gap-4">
          <div className="min-w-0 shrink-0 sm:w-52">
            <h1 className="text-xl sm:text-2xl font-bold leading-tight text-[var(--header-title)]">
              LedgerStack
            </h1>
            <p className="text-sm text-muted mt-1 leading-snug">
              {accessShellSubtitle(access)}
            </p>
          </div>
          <nav
            className="flex-1 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 sm:gap-x-6"
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
          <div className="hidden sm:block w-52 shrink-0" aria-hidden />
        </div>
      </header>

      <div className="flex flex-1 min-h-0 w-full">
        <AppSidebar
          access={access}
          onSignOut={onSignOut}
          signingOut={signingOut}
        />
        <main className={`min-w-0 overflow-auto ${mainClassName}`}>
          {children}
        </main>
      </div>
    </div>
  )
}

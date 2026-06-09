'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { accessShellSubtitle } from '@/lib/access-role-label'
import type { UserAccess } from '@/lib/roles'
import { AppSidebar } from '@/components/app-sidebar'
import { AutoFitHeaderSubtitle } from '@/components/auto-fit-header-subtitle'
import { SupportLink } from '@/components/support-link'

const headerUtilityLinkClass =
  'text-sm text-muted hover:text-brand-bright transition-colors whitespace-nowrap'

const mobileFooterLinkClass =
  'text-xs text-muted hover:text-brand-bright transition-colors whitespace-nowrap'

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
          <div className="min-w-0 flex-1 md:flex-none md:shrink-0 md:w-52">
            <h1 className="text-xl sm:text-2xl font-bold leading-tight text-[var(--header-title)]">
              LedgerStack
            </h1>
            <AutoFitHeaderSubtitle text={accessShellSubtitle(access)} />
          </div>
          <nav
            className="hidden md:flex flex-1 flex-wrap items-center justify-center gap-x-4 gap-y-1 lg:gap-x-6"
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
          <div className="hidden md:block w-52 shrink-0" aria-hidden />
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

      <footer className="md:hidden border-t border-border bg-background safe-bottom shrink-0 px-3 py-4 text-center text-sm text-muted space-y-2">
        <p>
          Questions? <SupportLink />
        </p>
        <nav
          className="flex flex-nowrap items-center justify-center gap-x-2 overflow-x-auto"
          aria-label="Legal and billing"
        >
          <Link href="/privacy" className={mobileFooterLinkClass}>
            Privacy Policy
          </Link>
          <span className="text-muted-dim text-xs" aria-hidden>
            ·
          </span>
          <Link href="/terms" className={mobileFooterLinkClass}>
            Terms of Service
          </Link>
          {access.canManageBilling && (
            <>
              <span className="text-muted-dim text-xs" aria-hidden>
                ·
              </span>
              <Link href="/settings/billing" className={mobileFooterLinkClass}>
                Billing
              </Link>
            </>
          )}
        </nav>
      </footer>
    </div>
  )
}

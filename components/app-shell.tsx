'use client'

import type { ReactNode } from 'react'
import type { UserAccess } from '@/lib/roles'
import { AppShellHeader } from '@/components/app-shell-header'
import { AppSidebar } from '@/components/app-sidebar'
import { MobileLegalFooterNav } from '@/components/mobile-legal-footer-nav'
import { SupportLink } from '@/components/support-link'

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
      <AppShellHeader access={access} />

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

      <footer className="md:hidden app-mobile-footer-safe-fab border-t border-border bg-background safe-bottom shrink-0 px-2 pt-4 text-center text-sm text-muted w-full">
        <div className="app-mobile-footer-safe-fab__content space-y-2">
          <p>
            Questions? <SupportLink />
          </p>
          <MobileLegalFooterNav access={access} />
        </div>
      </footer>
    </div>
  )
}

'use client'

import type { ReactNode } from 'react'
import { accessShellSubtitle } from '@/lib/access-role-label'
import type { UserAccess } from '@/lib/roles'
import { AppSidebar } from '@/components/app-sidebar'

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
        <div className="safe-x px-4 sm:px-6 lg:px-8 py-3 w-full">
          <h1 className="text-xl sm:text-2xl font-bold leading-tight text-[var(--header-title)]">
            LedgerStack
          </h1>
          <p className="text-sm text-muted mt-1 leading-snug">
            {accessShellSubtitle(access)}
          </p>
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

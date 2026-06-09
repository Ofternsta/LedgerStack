'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { UserAccess } from '@/lib/roles'

type NavItem = {
  href: string
  label: string
  visible: boolean
}

type AppSidebarProps = {
  access: UserAccess
  onSignOut: () => void
  signingOut?: boolean
}

export function AppSidebar({
  access,
  onSignOut,
  signingOut = false,
}: AppSidebarProps) {
  const pathname = usePathname()
  const [platformOwner, setPlatformOwner] = useState(false)

  useEffect(() => {
    fetch('/api/platform/check')
      .then((r) => r.json())
      .then((data) => setPlatformOwner(Boolean(data.owner)))
      .catch(() => setPlatformOwner(false))
  }, [])

  const items: NavItem[] = [
    { href: '/projects', label: 'Projects', visible: true },
    { href: '/team', label: 'Team', visible: access.canManageTeam },
    {
      href: '/calendar',
      label: 'Calendar',
      visible:
        access.canViewCalendar &&
        (access.role === 'admin' || access.canManageSchedule),
    },
    { href: '/dashboard', label: 'Analytics', visible: access.canViewAnalytics },
    { href: '/settings/account', label: 'Settings', visible: true },
    {
      href: '/settings/organization',
      label: 'Organization',
      visible: access.canManageSystemSettings,
    },
    {
      href: '/settings/backups',
      label: 'Backups',
      visible: access.canArchiveProject,
    },
    {
      href: '/settings/billing',
      label: 'Billing',
      visible: access.canManageBilling,
    },
    {
      href: '/settings/users',
      label: 'Accounts',
      visible: platformOwner,
    },
  ]

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  return (
    <aside className="app-sidebar flex flex-col shrink-0 w-48 sm:w-56 border-r border-border bg-surface min-h-0">
      <nav className="flex-1 py-3 space-y-0.5 overflow-y-auto" aria-label="App">
        {items
          .filter((item) => item.visible)
          .map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`app-sidebar-link${
                isActive(item.href) ? ' app-sidebar-link-active' : ''
              }${item.href === '/settings/users' ? ' app-sidebar-link-admin' : ''}`}
            >
              {item.label}
            </Link>
          ))}
      </nav>
      <div className="p-2 pt-0 border-t border-border shrink-0 safe-bottom">
        <button
          type="button"
          onClick={onSignOut}
          disabled={signingOut}
          className="app-sidebar-link app-sidebar-sign-out w-[calc(100%-1rem)] disabled:opacity-50"
        >
          {signingOut ? 'Signing out…' : 'Sign out'}
        </button>
      </div>
    </aside>
  )
}

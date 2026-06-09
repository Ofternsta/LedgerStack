'use client'

import { Fragment, useEffect, useState } from 'react'
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
      href: '/settings/users',
      label: 'Accounts',
      visible: platformOwner,
    },
  ]

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  const visibleItems = items.filter((item) => item.visible)
  const mainItems = visibleItems.filter((item) => item.href !== '/settings/users')
  const accountsItem = visibleItems.find((item) => item.href === '/settings/users')
  const backupsIndex = mainItems.findIndex((item) => item.href === '/settings/backups')
  const signOutAfterIndex =
    backupsIndex >= 0 ? backupsIndex : Math.max(0, mainItems.length - 1)

  const signOutButton = (
    <button
      type="button"
      onClick={onSignOut}
      disabled={signingOut}
      className="app-sidebar-link disabled:opacity-50"
    >
      {signingOut ? 'Signing out…' : 'Sign out'}
    </button>
  )

  return (
    <aside className="app-sidebar flex flex-col shrink-0 w-48 sm:w-56 border-r border-border bg-surface min-h-0">
      <nav className="py-3 space-y-0.5" aria-label="App">
        {mainItems.map((item, index) => (
          <Fragment key={item.href}>
            <Link
              href={item.href}
              className={`app-sidebar-link${
                isActive(item.href) ? ' app-sidebar-link-active' : ''
              }`}
            >
              {item.label}
            </Link>
            {index === signOutAfterIndex && signOutButton}
          </Fragment>
        ))}
        {mainItems.length === 0 && signOutButton}
        {accountsItem && (
          <Link
            href={accountsItem.href}
            className={`app-sidebar-link${
              isActive(accountsItem.href) ? ' app-sidebar-link-active' : ''
            } app-sidebar-link-admin`}
          >
            {accountsItem.label}
          </Link>
        )}
      </nav>
    </aside>
  )
}

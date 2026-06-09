'use client'

import { Fragment, useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { UserAccess } from '@/lib/roles'

const SIDEBAR_COLLAPSED_KEY = 'ledgerstack-sidebar-collapsed'
const MOBILE_SIDEBAR_MQ = '(max-width: 767px)'

function useIsMobileSidebar() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_SIDEBAR_MQ)
    const update = () => setIsMobile(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  return isMobile
}

type NavIconId =
  | 'projects'
  | 'team'
  | 'calendar'
  | 'analytics'
  | 'settings'
  | 'organization'
  | 'backups'
  | 'accounts'
  | 'sign-out'

type NavItem = {
  href: string
  label: string
  visible: boolean
  icon: NavIconId
  admin?: boolean
}

type AppSidebarProps = {
  access: UserAccess
  onSignOut: () => void
  signingOut?: boolean
}

function NavIcon({ id }: { id: NavIconId }) {
  const common = {
    width: 20,
    height: 20,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.75,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  }

  switch (id) {
    case 'projects':
      return (
        <svg {...common}>
          <path d="M3 7h18v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
          <path d="M3 7l2-4h14l2 4" />
          <path d="M12 11v4" />
        </svg>
      )
    case 'team':
      return (
        <svg {...common}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      )
    case 'calendar':
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      )
    case 'analytics':
      return (
        <svg {...common}>
          <path d="M3 3v18h18" />
          <path d="M7 16l4-5 4 3 5-7" />
        </svg>
      )
    case 'settings':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
        </svg>
      )
    case 'organization':
      return (
        <svg {...common}>
          <path d="M3 21h18" />
          <path d="M5 21V7l7-4 7 4v14" />
          <path d="M9 21v-6h6v6" />
          <path d="M9 9h.01M15 9h.01M9 13h.01M15 13h.01" />
        </svg>
      )
    case 'backups':
      return (
        <svg {...common}>
          <path d="M12 3v12" />
          <path d="m7 10 5 5 5-5" />
          <path d="M5 15v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3" />
        </svg>
      )
    case 'accounts':
      return (
        <svg {...common}>
          <path d="M12 3l8 4v6c0 5-3.5 8-8 8s-8-3-8-8V7l8-4z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
      )
    case 'sign-out':
      return (
        <svg {...common}>
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <path d="M16 17l5-5-5-5" />
          <path d="M21 12H9" />
        </svg>
      )
    default:
      return null
  }
}

export function AppSidebar({
  access,
  onSignOut,
  signingOut = false,
}: AppSidebarProps) {
  const pathname = usePathname()
  const [platformOwner, setPlatformOwner] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const isMobile = useIsMobileSidebar()
  const effectiveCollapsed = isMobile || collapsed

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1')
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    fetch('/api/platform/check')
      .then((r) => r.json())
      .then((data) => setPlatformOwner(Boolean(data.owner)))
      .catch(() => setPlatformOwner(false))
  }, [])

  function toggleCollapsed() {
    if (isMobile) return
    setCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? '1' : '0')
      } catch {
        /* ignore */
      }
      return next
    })
  }

  const items: NavItem[] = [
    { href: '/projects', label: 'Projects', visible: true, icon: 'projects' },
    {
      href: '/team',
      label: 'Team',
      visible: access.canManageTeam,
      icon: 'team',
    },
    {
      href: '/calendar',
      label: 'Calendar',
      visible:
        access.canViewCalendar &&
        (access.role === 'admin' || access.canManageSchedule),
      icon: 'calendar',
    },
    {
      href: '/dashboard',
      label: 'Analytics',
      visible: access.canViewAnalytics,
      icon: 'analytics',
    },
    {
      href: '/settings/account',
      label: 'Settings',
      visible: true,
      icon: 'settings',
    },
    {
      href: '/settings/organization',
      label: 'Organization',
      visible: access.canManageSystemSettings,
      icon: 'organization',
    },
    {
      href: '/settings/backups',
      label: 'Backups',
      visible: access.canArchiveProject,
      icon: 'backups',
    },
    {
      href: '/settings/users',
      label: 'Accounts',
      visible: platformOwner,
      icon: 'accounts',
      admin: true,
    },
  ]

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  const visibleItems = items.filter((item) => item.visible)
  const mainItems = visibleItems.filter((item) => item.href !== '/settings/users')
  const accountsItem = visibleItems.find((item) => item.href === '/settings/users')
  const backupsIndex = mainItems.findIndex(
    (item) => item.href === '/settings/backups'
  )
  const signOutAfterIndex =
    backupsIndex >= 0 ? backupsIndex : Math.max(0, mainItems.length - 1)

  function linkClass(active: boolean, admin?: boolean) {
    let cls = 'app-sidebar-link'
    if (active) cls += ' app-sidebar-link-active'
    if (admin) cls += ' app-sidebar-link-admin'
    if (effectiveCollapsed) cls += ' app-sidebar-link-collapsed'
    return cls
  }

  function navLink(item: NavItem) {
    const active = isActive(item.href)
    return (
      <Link
        key={item.href}
        href={item.href}
        className={linkClass(active, item.admin)}
        title={effectiveCollapsed ? item.label : undefined}
        aria-label={effectiveCollapsed ? item.label : undefined}
      >
        <span className="app-sidebar-link-icon">
          <NavIcon id={item.icon} />
        </span>
        {!effectiveCollapsed && (
          <span className="app-sidebar-link-label">{item.label}</span>
        )}
      </Link>
    )
  }

  const signOutButton = (
    <button
      type="button"
      onClick={onSignOut}
      disabled={signingOut}
      className={`${linkClass(false)} disabled:opacity-50`}
      title={effectiveCollapsed ? (signingOut ? 'Signing out…' : 'Sign out') : undefined}
      aria-label={effectiveCollapsed ? (signingOut ? 'Signing out' : 'Sign out') : undefined}
    >
      <span className="app-sidebar-link-icon">
        <NavIcon id="sign-out" />
      </span>
      {!effectiveCollapsed && (
        <span className="app-sidebar-link-label">
          {signingOut ? 'Signing out…' : 'Sign out'}
        </span>
      )}
    </button>
  )

  return (
    <aside
      className={`app-sidebar flex flex-col shrink-0 border-r border-border bg-surface min-h-0 ${
        effectiveCollapsed ? 'app-sidebar--collapsed w-[3.75rem]' : 'w-48 sm:w-56'
      }`}
    >
      {!isMobile && (
      <div
        className={`flex items-center shrink-0 px-2 pt-2 ${
          effectiveCollapsed ? 'justify-center' : 'justify-end'
        }`}
      >
        <button
          type="button"
          onClick={toggleCollapsed}
          className="app-sidebar-toggle"
          aria-expanded={!effectiveCollapsed}
          aria-label={effectiveCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={effectiveCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg
            width={18}
            height={18}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
            className={`transition-transform ${effectiveCollapsed ? 'rotate-180' : ''}`}
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      </div>
      )}

      <nav className="py-2 space-y-0.5 flex-1 overflow-y-auto" aria-label="App">
        {mainItems.map((item, index) => (
          <Fragment key={item.href}>
            {navLink(item)}
            {index === signOutAfterIndex && signOutButton}
          </Fragment>
        ))}
        {mainItems.length === 0 && signOutButton}
        {accountsItem && navLink(accountsItem)}
      </nav>
    </aside>
  )
}

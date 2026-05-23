'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { UserAccess } from '@/lib/roles'

type AppNavProps = {
  access: UserAccess
}

export function AppNav({ access }: AppNavProps) {
  const [platformOwner, setPlatformOwner] = useState(false)

  useEffect(() => {
    fetch('/api/platform/check')
      .then((r) => r.json())
      .then((data) => setPlatformOwner(Boolean(data.owner)))
      .catch(() => setPlatformOwner(false))
  }, [])

  return (
    <nav className="flex flex-wrap gap-2 text-sm">
      <Link
        href="/projects"
        className="px-3 py-2 rounded-lg bg-gray-100 font-medium min-h-[40px] inline-flex items-center"
      >
        Projects
      </Link>
      {access.role !== 'client' && (
        <Link
          href="/calendar"
          className="px-3 py-2 rounded-lg bg-gray-100 font-medium min-h-[40px] inline-flex items-center"
        >
          Calendar
        </Link>
      )}
      {access.canViewAnalytics && (
        <Link
          href="/dashboard"
          className="px-3 py-2 rounded-lg bg-gray-100 font-medium min-h-[40px] inline-flex items-center"
        >
          Analytics
        </Link>
      )}
      {access.canManageBilling && (
        <Link
          href="/settings/billing"
          className="px-3 py-2 rounded-lg bg-gray-100 font-medium min-h-[40px] inline-flex items-center"
        >
          Billing
        </Link>
      )}
      {platformOwner && (
        <Link
          href="/settings/users"
          className="px-3 py-2 rounded-lg bg-red-50 text-red-900 border border-red-100 font-medium min-h-[40px] inline-flex items-center"
        >
          Accounts
        </Link>
      )}
    </nav>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { MessagingLauncher } from '@/components/messaging-launcher'
import { loadUserAccess } from '@/lib/load-access'
import type { UserAccess } from '@/lib/roles'
import { supabase } from '@/lib/supabase'

const HIDE_PATHS = ['/', '/login', '/login/reset-password']

export function AppMessagingRoot() {
  const pathname = usePathname()
  const [access, setAccess] = useState<UserAccess | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const hide =
      HIDE_PATHS.includes(pathname) || pathname.startsWith('/auth')

    if (hide) {
      setAccess(null)
      setReady(true)
      return
    }

    let cancelled = false

    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (cancelled) return

      if (!user) {
        setAccess(null)
        setUserId(null)
        setReady(true)
        return
      }

      setUserId(user.id)
      const { access: a } = await loadUserAccess()
      if (!cancelled) {
        setAccess(a)
        setReady(true)
      }
    }

    void init()
    return () => {
      cancelled = true
    }
  }, [pathname])

  if (!ready || !access?.canUseTeamMessages) return null
  if (access.role === 'client') return null
  if (access.role === 'worker' && access.workerStatus === 'pending') return null

  const canSend =
    access.role === 'admin' ||
    (access.role === 'worker' && access.workerStatus === 'approved')

  return (
    <div className="fixed z-[80] top-[max(env(safe-area-inset-top,0px),0.75rem)] right-3 pointer-events-none">
      <div className="pointer-events-auto">
        <MessagingLauncher currentUserId={userId} canSend={canSend} />
      </div>
    </div>
  )
}

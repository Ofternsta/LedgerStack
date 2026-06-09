'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppFooter } from '@/components/app-footer'
import { AppShell } from '@/components/app-shell'
import { BackupSettingsPanel } from '@/components/backup-settings-panel'
import { PlanUpgradeBanner } from '@/components/plan-upgrade-banner'
import { loadUserAccess } from '@/lib/load-access'
import type { UserAccess } from '@/lib/roles'
import { supabase } from '@/lib/supabase'

export default function BackupsSettingsPage() {
  const router = useRouter()
  const [access, setAccess] = useState<UserAccess | null>(null)
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    loadUserAccess().then(({ access: a, needsProfileSetup }) => {
      if (!a || needsProfileSetup) {
        router.push('/login')
        return
      }
      if (a.role !== 'admin') {
        router.replace('/projects')
        return
      }
      setAccess(a)
    })
  }, [router])

  async function signOut() {
    setSigningOut(true)
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
    setSigningOut(false)
  }

  if (!access) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <p className="text-muted">Loading…</p>
      </div>
    )
  }

  const canUseBackups = access.canArchiveProject

  return (
    <AppShell
      access={access}
      onSignOut={signOut}
      signingOut={signingOut}
      mainClassName="flex-1 safe-x px-4 sm:px-6 lg:px-8 py-4 max-w-lg mx-auto w-full pb-8 safe-bottom space-y-6"
    >
      {!canUseBackups ? (
        <PlanUpgradeBanner message="Automatic backups require Starter or higher (plans with PDF export). Upgrade in Billing to enable scheduled and on-completion backups." />
      ) : (
        <BackupSettingsPanel canManage />
      )}

      <AppFooter />
    </AppShell>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppFooter } from '@/components/app-footer'
import { AppHeader } from '@/components/app-header'
import { AppNav } from '@/components/app-nav'
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
    <div className="min-h-dvh flex flex-col">
      <AppHeader
        title="Backups"
        subtitle="Scheduled ZIP copies of your projects"
        backHref="/projects"
        backLabel="Projects"
        onSignOut={signOut}
        signingOut={signingOut}
      />

      <main className="flex-1 safe-x px-4 py-4 max-w-lg mx-auto w-full pb-8 safe-bottom space-y-6">
        <AppNav access={access} />

        {!canUseBackups ? (
          <PlanUpgradeBanner message="Automatic backups require Starter or higher (plans with PDF export). Upgrade in Billing to enable scheduled and on-completion backups." />
        ) : (
          <BackupSettingsPanel canManage />
        )}

        <AppFooter />
      </main>
    </div>
  )
}

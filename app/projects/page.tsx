'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AppHeader } from '@/components/app-header'
import { LedgerStackLoader } from '@/components/ledgerstack-loader'
import { AppFooter } from '@/components/app-footer'
import { AppNav } from '@/components/app-nav'
import { LegalNotice } from '@/components/legal-notice'
import { PlanUpgradeBanner } from '@/components/plan-upgrade-banner'
import { ClientSignatureBanner } from '@/components/client-signature-banner'
import { AdminSignatureNotificationsBanner } from '@/components/admin-signature-notifications-banner'
import { isUnlimited } from '@/lib/plan-entitlements'
import { linkClientAccessByEmail } from '@/lib/auth-signup'
import { loadUserAccess } from '@/lib/load-access'
import type { UserAccess } from '@/lib/roles'
import { supabase } from '@/lib/supabase'

type Project = {
  id: string
  customer_name: string
  project_address: string
  notes?: string
}

export default function ProjectsPage() {
  const router = useRouter()
  const [access, setAccess] = useState<UserAccess | null>(null)
  const [accessLoading, setAccessLoading] = useState(true)
  const [customerName, setCustomerName] = useState('')
  const [projectAddress, setProjectAddress] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [projects, setProjects] = useState<Project[]>([])
  const [creating, setCreating] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [projectSearch, setProjectSearch] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [signingOut, setSigningOut] = useState(false)

  async function refreshAccess() {
    const linkRes = await fetch('/api/auth/link-client-access', {
      method: 'POST',
    })
    if (!linkRes.ok) {
      await linkClientAccessByEmail()
    }
    let { access: a, needsProfileSetup } = await loadUserAccess()

    if (needsProfileSetup) {
      const res = await fetch('/api/auth/complete-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (res.ok) {
        await linkClientAccessByEmail()
        const retry = await loadUserAccess()
        a = retry.access
        needsProfileSetup = retry.needsProfileSetup
      }
    }

    if (needsProfileSetup && !a) {
      router.push('/login')
      setAccessLoading(false)
      return null
    }

    if (a?.canManageBilling) {
      const billingRes = await fetch('/api/billing')
      const billing = await billingRes.json().catch(() => ({}))
      if (billingRes.ok && billing.needsPlanSelection) {
        router.push('/onboarding/subscription?renew=1')
        setAccessLoading(false)
        return null
      }
    }

    setAccess(a)
    setAccessLoading(false)
    return a
  }

  async function fetchProjects(role: UserAccess['role']) {
    const res = await fetch('/api/projects')
    const payload = await res.json().catch(() => ({}))
    if (!res.ok) {
      console.error(payload.error || 'Failed to load projects')
      setProjects([])
      return
    }
    if (payload.blocked && role === 'worker') {
      setProjects([])
      return
    }
    setProjects((payload.projects || []) as Project[])
  }

  async function signOut() {
    setSigningOut(true)
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
    setSigningOut(false)
  }

  async function createProject() {
    if (
      !customerName.trim() ||
      !projectAddress.trim() ||
      !jobDescription.trim() ||
      !access
    ) {
      return
    }
    if (!access.canCreateProject || !access.organizationId) return

    setCreating(true)

    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_name: customerName,
        project_address: projectAddress,
        job_description: jobDescription,
      }),
    })
    const payload = await res.json().catch(() => ({}))

    if (!res.ok) {
      alert(
        payload.error ||
          'Could not create project. Run supabase/projects-rls-fix.sql in Supabase SQL Editor.'
      )
      setCreating(false)
      return
    }

    const created = payload.project as Project | undefined
    if (created?.id) {
      setProjects((prev) => [
        created,
        ...prev.filter((p) => p.id !== created.id),
      ])
    } else {
      await fetchProjects(access.role)
    }

    setCustomerName('')
    setProjectAddress('')
    setJobDescription('')
    setShowCreateForm(false)
    setCreating(false)
  }

  async function removeProject(project: Project) {
    const ok = window.confirm(
      `Delete "${project.customer_name}" and all jobs and uploaded files? This cannot be undone.`
    )
    if (!ok) return

    setDeletingId(project.id)
    const res = await fetch(`/api/projects/${project.id}`, { method: 'DELETE' })
    const payload = await res.json().catch(() => ({}))
    if (!res.ok) {
      alert(payload.error || 'Could not delete project.')
    } else if (access) {
      await fetchProjects(access.role)
    }
    setDeletingId(null)
  }

  useEffect(() => {
    refreshAccess().then((a) => {
      if (!a) return
      if (
        a.role === 'client' ||
        a.role !== 'worker' ||
        a.workerStatus === 'approved'
      ) {
        void fetchProjects(a.role)
      }
    })
  }, [])

  const searchQuery = projectSearch.trim().toLowerCase()
  const filteredProjects = useMemo(() => {
    if (!searchQuery) return projects
    return projects.filter((p) => {
      const name = p.customer_name.toLowerCase()
      const address = p.project_address.toLowerCase()
      return name.includes(searchQuery) || address.includes(searchQuery)
    })
  }, [projects, searchQuery])

  if (accessLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <LedgerStackLoader />
      </div>
    )
  }

  if (!access) {
    return null
  }

  const roleLabel =
    access.role === 'admin'
      ? 'Admin'
      : access.role === 'worker'
        ? 'Worker'
        : 'Client'

  if (access.role === 'worker' && access.workerStatus === 'pending') {
    return (
      <div className="min-h-dvh flex flex-col">
        <AppHeader
          title="Awaiting approval"
          subtitle={`${access.organizationName || 'Organization'} — worker account`}
          onSignOut={signOut}
          signingOut={signingOut}
        />
        <main className="flex-1 safe-x px-4 py-8 max-w-lg mx-auto text-center space-y-4">
          <p className="text-muted leading-relaxed">
            Your admin must approve you <strong>one time</strong> before you
            can view or add to projects. Ask them to open the app and tap
            Approve on your request.
          </p>
          <button
            type="button"
            onClick={() =>
              refreshAccess().then((a) => a && fetchProjects(a.role))
            }
            className="btn-primary text-[#052e16] px-6 py-3 rounded-xl font-medium min-h-[48px]"
          >
            Check again
          </button>
        </main>
      </div>
    )
  }

  if (access.role === 'worker' && access.workerStatus === 'none') {
    return (
      <div className="min-h-dvh flex flex-col">
        <AppHeader title="No organization" onSignOut={signOut} signingOut={signingOut} />
        <main className="flex-1 safe-x px-4 py-8 max-w-lg mx-auto text-center space-y-4">
          <p className="text-muted">
            Sign up again with a valid organization invite code from your admin.
          </p>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-dvh flex flex-col">
      <AppHeader
        title="LedgerStack"
        subtitle={`${roleLabel}${access.organizationName ? ` · ${access.organizationName}` : ''}`}
        onSignOut={signOut}
        signingOut={signingOut}
      />

      <main className="flex-1 safe-x px-4 sm:px-6 lg:px-8 py-4 w-full max-w-[1600px] mx-auto pb-28 safe-bottom space-y-5">
        <AppNav access={access} />

        <label className="block">
          <span className="sr-only">Search projects</span>
          <input
            type="search"
            value={projectSearch}
            onChange={(e) => setProjectSearch(e.target.value)}
            placeholder="Search by client name or address…"
            className="w-full border border-border rounded-xl p-3 bg-surface text-foreground placeholder:text-muted-dim"
            autoComplete="off"
          />
        </label>

        {access.planName && (
          <p className="text-xs text-muted">
            Plan: <strong>{access.planName}</strong>
            {!isUnlimited(access.aiSummariesLimit) && (
              <>
                {' '}
                · AI summaries {access.aiSummariesUsed}/{access.aiSummariesLimit}{' '}
                this month
              </>
            )}
            {!isUnlimited(access.activeProjectsLimit) && (
              <> · up to {access.activeProjectsLimit} projects</>
            )}
          </p>
        )}

        {!access.canCreateProject &&
          access.role === 'admin' && (
            <PlanUpgradeBanner message="You have reached your project limit on this plan. Upgrade in Billing to add more projects." />
          )}

        {access.downgradeNotice && (
          <p className="text-sm bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-3">
            {access.downgradeNotice}
          </p>
        )}

        {access.role === 'worker' && (
          <p className="text-sm text-muted bg-surface-elevated border border-border rounded-xl p-3">
            Workers cannot create projects. Your admin creates jobs and assigns you
            under each project&apos;s &quot;Assign workers&quot; section.
          </p>
        )}
        {access.workerBlockedByStaffLimit && (
          <p className="text-sm bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-3">
            Your organization currently has too many workers for this plan.
            Workers cannot access projects until the company upgrades or reduces
            approved workers.
          </p>
        )}

        {access.role === 'admin' && <AdminSignatureNotificationsBanner />}

        {access.role === 'client' && (
          <>
            <ClientSignatureBanner />
            <p className="text-sm text-muted bg-blue-50 border border-blue-100 rounded-xl p-3">
              You can only open projects your contractor has granted to your email.
            </p>
          </>
        )}

        {access.role === 'admin' && (
          <LegalNotice id="data-retention" className="mb-4" />
        )}

        <section className="flex-1 min-h-0">
          <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
            <h2 className="font-bold text-lg">
              {access.role === 'client' ? 'Shared with you' : 'Your projects'}
            </h2>
            {projects.length > 0 && (
              <p className="text-sm text-muted">
                {filteredProjects.length === projects.length
                  ? `${projects.length} project${projects.length === 1 ? '' : 's'}`
                  : `${filteredProjects.length} of ${projects.length}`}
              </p>
            )}
          </div>

          {projects.length === 0 && (
            <p className="text-muted-dim text-center py-12">
              {access.role === 'client'
                ? 'No projects shared with you yet. Ask your contractor admin to grant access using your signup email.'
                : access.role === 'worker'
                  ? 'No projects assigned to you yet. Your organization admin must assign you to a project before you can open it.'
                  : 'No projects yet. Use Create project in the bottom left to add your first one.'}
            </p>
          )}

          {projects.length > 0 && filteredProjects.length === 0 && (
            <p className="text-muted-dim text-center py-12">
              No projects match &ldquo;{projectSearch.trim()}&rdquo;. Try a
              different client name or address.
            </p>
          )}

          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProjects.map((p) => (
              <li
                key={p.id}
                className="border border-border rounded-xl bg-surface-elevated shadow-sm overflow-hidden flex flex-col min-h-[120px]"
              >
                {access.workerBlockedByStaffLimit ? (
                  <div className="block p-4 flex-1 opacity-80">
                    <p className="font-bold text-base leading-snug line-clamp-2">
                      {p.customer_name}
                    </p>
                    <p className="text-sm text-muted mt-2 line-clamp-3">
                      {p.project_address}
                    </p>
                  </div>
                ) : (
                  <Link
                    href={`/project/${p.id}`}
                    className="block p-4 flex-1 active:bg-surface hover:bg-surface transition-colors"
                  >
                    <p className="font-bold text-base leading-snug line-clamp-2">
                      {p.customer_name}
                    </p>
                    <p className="text-sm text-muted mt-2 line-clamp-3">
                      {p.project_address}
                    </p>
                  </Link>
                )}
                {access.canDeleteProject && (
                  <button
                    type="button"
                    onClick={() => removeProject(p)}
                    disabled={deletingId === p.id}
                    className="w-full border-t border-red-900/40 py-2.5 text-red-400 text-sm font-semibold disabled:opacity-50 min-h-[44px] active:bg-red-50 mt-auto"
                  >
                    {deletingId === p.id ? 'Deleting…' : 'Delete project'}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>

        <AppFooter />
      </main>

      {access.canCreateProject && (
        <>
          {showCreateForm && (
            <section
              className="fixed z-40 bottom-[4.75rem] left-4 right-4 sm:right-auto sm:w-full sm:max-w-md border border-border rounded-xl p-4 bg-surface-elevated shadow-2xl space-y-3 safe-left safe-right"
              aria-label="New project"
            >
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-bold text-lg">New project</h2>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="text-sm text-muted hover:text-foreground min-h-[40px] px-2"
                  aria-label="Close new project form"
                >
                  Close
                </button>
              </div>

              <input
                className="border border-border rounded-xl p-3 w-full bg-surface"
                placeholder="Customer name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />

              <input
                className="border border-border rounded-xl p-3 w-full bg-surface"
                placeholder="Project address"
                value={projectAddress}
                onChange={(e) => setProjectAddress(e.target.value)}
              />

              <label className="block space-y-1">
                <span className="text-sm font-medium text-foreground">
                  Job description
                </span>
                <textarea
                  className="border border-border rounded-xl p-3 w-full min-h-[88px] bg-surface"
                  placeholder="Describe the work for this job"
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  required
                />
              </label>

              <button
                type="button"
                onClick={createProject}
                disabled={
                  creating ||
                  !customerName.trim() ||
                  !projectAddress.trim() ||
                  !jobDescription.trim()
                }
                className="w-full btn-primary text-[#052e16] py-4 rounded-xl font-medium disabled:opacity-50 min-h-[52px]"
              >
                {creating ? 'Creating…' : 'Create Project'}
              </button>
            </section>
          )}

          <button
            type="button"
            onClick={() => setShowCreateForm((open) => !open)}
            className="fixed z-50 bottom-4 left-4 safe-left btn-primary text-[#052e16] px-5 py-3 rounded-xl font-semibold shadow-lg min-h-[48px]"
          >
            {showCreateForm ? 'Hide form' : 'Create project'}
          </button>
        </>
      )}
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { AppShell } from '@/components/app-shell'
import { AppFooter } from '@/components/app-footer'
import { ProjectMonthCalendar } from '@/components/project-month-calendar'
import { loadUserAccess } from '@/lib/load-access'
import type { UserAccess } from '@/lib/roles'
import { supabase } from '@/lib/supabase'

type ProjectRow = {
  id: string
  customer_name: string
  project_address: string
}

export default function CalendarPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const projectFromUrl = searchParams.get('project') || ''

  const [access, setAccess] = useState<UserAccess | null>(null)
  const [projects, setProjects] = useState<ProjectRow[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState(projectFromUrl)
  const [loading, setLoading] = useState(true)
  const [signingOut, setSigningOut] = useState(false)
  const [projectCanAddEvents, setProjectCanAddEvents] = useState(false)

  const isAdmin = access?.role === 'admin'

  const selectedProject = projects.find((p) => p.id === selectedProjectId) ?? null

  useEffect(() => {
    loadUserAccess().then(({ access: a }) => {
      if (!a || a.role === 'client' || !a.canViewCalendar) {
        router.replace('/projects')
        return
      }
      setAccess(a)
    })
  }, [router])

  useEffect(() => {
    if (!access) return
    fetch('/api/projects')
      .then((r) => r.json())
      .then((d) => setProjects(d.projects || []))
      .catch(() => setProjects([]))
      .finally(() => setLoading(false))
  }, [access])

  useEffect(() => {
    if (projectFromUrl && projectFromUrl !== selectedProjectId) {
      setSelectedProjectId(projectFromUrl)
    }
  }, [projectFromUrl, selectedProjectId])

  useEffect(() => {
    if (!access || !selectedProjectId) {
      setProjectCanAddEvents(false)
      return
    }
    if (access.role === 'admin') {
      setProjectCanAddEvents(true)
      return
    }
    if (access.role !== 'worker' || !access.canManageSchedule) {
      setProjectCanAddEvents(false)
      return
    }
    let cancelled = false
    fetch(`/api/projects/${selectedProjectId}/my-access`)
      .then((r) => r.json())
      .then((payload) => {
        if (cancelled) return
        setProjectCanAddEvents(Boolean(payload.permissions?.can_add_events))
      })
      .catch(() => {
        if (!cancelled) setProjectCanAddEvents(false)
      })
    return () => {
      cancelled = true
    }
  }, [access, selectedProjectId])

  function selectProject(id: string) {
    setSelectedProjectId(id)
    const params = new URLSearchParams(searchParams.toString())
    params.set('project', id)
    router.replace(`/calendar?${params}`)
  }

  function clearProject() {
    setSelectedProjectId('')
    router.replace('/calendar')
  }

  async function signOut() {
    setSigningOut(true)
    await supabase.auth.signOut()
    router.push('/login')
    setSigningOut(false)
  }

  if (!access) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <p className="text-muted">Loading…</p>
      </div>
    )
  }

  return (
    <AppShell
      access={access}
      onSignOut={signOut}
      signingOut={signingOut}
      mainClassName="flex-1 safe-x px-4 sm:px-6 lg:px-8 py-4 max-w-3xl mx-auto w-full pb-8 safe-bottom space-y-4"
    >
        {!selectedProjectId ? (
          <section className="card-elevated p-5 space-y-4">
            <div>
              <h2 className="font-bold text-lg text-foreground">
                Choose a project
              </h2>
              <p className="text-sm text-muted mt-1">
                Each project has its own calendar. Pick one to view or schedule
                events.
              </p>
            </div>
            {loading ? (
              <p className="text-sm text-muted-dim">Loading projects…</p>
            ) : projects.length === 0 ? (
              <p className="text-sm text-muted-dim">
                No projects yet.{' '}
                <Link href="/projects" className="text-brand-bright hover:underline">
                  Create a project
                </Link>{' '}
                to use the calendar.
              </p>
            ) : (
              <ul className="space-y-2">
                {projects.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => selectProject(p.id)}
                      className="w-full text-left border border-border rounded-xl p-4 bg-surface hover:border-brand-dim/50 min-h-[56px]"
                    >
                      <p className="font-semibold text-foreground">
                        {p.customer_name}
                      </p>
                      {p.project_address && (
                        <p className="text-sm text-muted mt-0.5">
                          {p.project_address}
                        </p>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={clearProject}
                className="text-sm text-brand-bright font-medium min-h-[44px]"
              >
                ← Change project
              </button>
              <Link
                href={`/project/${selectedProjectId}`}
                className="text-sm text-muted hover:text-brand-bright min-h-[44px] inline-flex items-center"
              >
                Open project
              </Link>
            </div>

            <section className="card-elevated p-4">
              <ProjectMonthCalendar
                projectId={selectedProjectId}
                canAddEvents={isAdmin || projectCanAddEvents}
                canDeleteEvents={isAdmin}
                canMarkComplete={isAdmin}
              />
            </section>
          </>
        )}

        <AppFooter />
    </AppShell>
  )
}

'use client'

import { useCallback, useEffect, useState } from 'react'
import { ProjectClientPanel } from '@/components/project-client-panel'
import { ProjectFileCategoriesEditor } from '@/components/project-file-categories-editor'
import { ProjectStatusWorkflowEditor } from '@/components/project-status-workflow-editor'
import { ProjectWorkerPanel } from '@/components/project-worker-panel'
import { LegalNotice } from '@/components/legal-notice'
import {
  COMPLETED_PROJECT_RETENTION_DAYS,
  INACTIVE_PROJECT_RETENTION_MONTHS,
} from '@/lib/data-retention'
import { LEGAL_CONTACT_EMAIL } from '@/lib/legal-meta'
import { parseDefaultWorkerPermissions } from '@/lib/org-status-labels'
import { supportMailtoUrl } from '@/lib/support'
import {
  DEFAULT_WORKER_PERMISSIONS,
  WORKER_PERMISSION_LABELS,
  type WorkerPermissionKey,
  type WorkerPermissions,
} from '@/lib/worker-permissions'

type ProjectRow = {
  id: string
  customer_name: string
  project_address: string
  notes: string | null
}

const PERM_KEYS = Object.keys(
  WORKER_PERMISSION_LABELS
) as WorkerPermissionKey[]

export function OrganizationSettingsPanel() {
  const [workerDefaults, setWorkerDefaults] = useState<WorkerPermissions>({
    ...DEFAULT_WORKER_PERMISSIONS,
  })
  const [projects, setProjects] = useState<ProjectRow[]>([])
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null)
  const [draftNames, setDraftNames] = useState<
    Record<string, { customer_name: string; project_address: string }>
  >({})
  const [loading, setLoading] = useState(true)
  const [savingWorkers, setSavingWorkers] = useState(false)
  const [savingProjectId, setSavingProjectId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    const [settingsRes, projectsRes] = await Promise.all([
      fetch('/api/org/settings'),
      fetch('/api/projects'),
    ])
    const settingsPayload = await settingsRes.json().catch(() => ({}))
    const projectsPayload = await projectsRes.json().catch(() => ({}))

    if (!settingsRes.ok) {
      setError(settingsPayload.error || 'Could not load organization settings')
      setLoading(false)
      return
    }

    setWorkerDefaults(
      parseDefaultWorkerPermissions(settingsPayload.default_worker_permissions)
    )

    const rows = (projectsPayload.projects || []) as ProjectRow[]
    setProjects(rows)
    setDraftNames(
      Object.fromEntries(
        rows.map((p) => [
          p.id,
          {
            customer_name: p.customer_name,
            project_address: p.project_address,
          },
        ])
      )
    )
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function saveWorkerDefaults(e: React.FormEvent) {
    e.preventDefault()
    setSavingWorkers(true)
    setMessage(null)
    setError(null)

    const res = await fetch('/api/org/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ default_worker_permissions: workerDefaults }),
    })
    const payload = await res.json().catch(() => ({}))

    if (!res.ok) {
      setError(payload.error || 'Could not save worker defaults')
    } else {
      setWorkerDefaults(
        payload.default_worker_permissions ?? workerDefaults
      )
      setMessage('Default worker permissions saved.')
    }
    setSavingWorkers(false)
  }

  async function saveProjectName(projectId: string) {
    const draft = draftNames[projectId]
    if (!draft?.customer_name.trim() || !draft?.project_address.trim()) return

    setSavingProjectId(projectId)
    setMessage(null)
    setError(null)

    const res = await fetch(`/api/projects/${projectId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_name: draft.customer_name.trim(),
        project_address: draft.project_address.trim(),
      }),
    })
    const payload = await res.json().catch(() => ({}))

    if (!res.ok) {
      setError(payload.error || 'Could not update project')
    } else {
      setMessage('Project updated.')
      await load()
    }
    setSavingProjectId(null)
  }

  if (loading) {
    return <p className="text-muted text-sm">Loading organization settings…</p>
  }

  return (
    <div className="space-y-6">
      {error && (
        <p className="text-sm text-red-400 border border-red-900/40 rounded-lg p-3">
          {error}
        </p>
      )}
      {message && (
        <p className="text-sm text-green-700 border border-green-200 bg-green-50 rounded-lg p-3">
          {message}
        </p>
      )}

      <section className="card p-4 space-y-3">
        <h2 className="font-bold text-foreground">Data retention</h2>
        <ul className="text-sm text-muted space-y-2 list-disc pl-5">
          <li>
            Completed projects (all jobs marked Completed) are deleted after{' '}
            {COMPLETED_PROJECT_RETENTION_DAYS} days, including files and messages.
          </li>
          <li>
            Inactive projects (not completed) with no activity for{' '}
            {INACTIVE_PROJECT_RETENTION_MONTHS} months are deleted automatically.
          </li>
          <li>
            Org backups (Backups settings) may be kept separately up to your plan
            limit (5 Starter · 15 Professional · 30 Enterprise).
          </li>
        </ul>
        <p className="text-sm text-muted">
          To delete your entire account and organization data, email{' '}
          <a
            href={supportMailtoUrl('Account deletion request')}
            className="text-brand-bright underline"
          >
            {LEGAL_CONTACT_EMAIL}
          </a>
          . We will verify ownership before processing.
        </p>
        <LegalNotice id="data-retention" showLegalLinks />
      </section>

      <form onSubmit={saveWorkerDefaults} className="card p-4 space-y-4">
        <h2 className="font-bold text-foreground">Default worker access</h2>
        <p className="text-sm text-muted">
          Applied when you approve new workers. Adjust per project below.
        </p>
        <div className="space-y-3">
          {PERM_KEYS.map((key) => (
            <label
              key={key}
              className="flex items-start gap-3 text-sm cursor-pointer"
            >
              <input
                type="checkbox"
                checked={workerDefaults[key]}
                onChange={(e) =>
                  setWorkerDefaults((prev) => ({
                    ...prev,
                    [key]: e.target.checked,
                  }))
                }
                className="mt-1"
              />
              <span>
                <span className="font-medium text-foreground">
                  {WORKER_PERMISSION_LABELS[key].label}
                </span>
                <span className="block text-muted text-xs">
                  {WORKER_PERMISSION_LABELS[key].description}
                </span>
              </span>
            </label>
          ))}
        </div>
        <button
          type="submit"
          disabled={savingWorkers}
          className="btn-primary px-4 py-2 text-sm min-h-[44px]"
        >
          {savingWorkers ? 'Saving…' : 'Save worker defaults'}
        </button>
      </form>

      <section className="card p-4 space-y-4">
        <h2 className="font-bold text-foreground">Projects</h2>
        <p className="text-sm text-muted">
          Rename projects, customize job status stages and file categories per
          project, and manage client and worker access.
        </p>

        {projects.length === 0 ? (
          <p className="text-sm text-muted">No projects yet.</p>
        ) : (
          <ul className="space-y-3">
            {projects.map((p) => {
              const draft = draftNames[p.id] ?? {
                customer_name: p.customer_name,
                project_address: p.project_address,
              }
              const expanded = expandedProjectId === p.id

              return (
                <li
                  key={p.id}
                  className="border border-border rounded-xl overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedProjectId(expanded ? null : p.id)
                    }
                    className="w-full text-left px-4 py-3 hover:bg-surface-elevated transition"
                  >
                    <p className="font-semibold text-foreground">
                      {p.customer_name}
                    </p>
                    <p className="text-xs text-muted truncate">
                      {p.project_address}
                    </p>
                  </button>

                  {expanded && (
                    <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
                      <div className="space-y-2">
                        <label className="block text-sm">
                          <span className="text-muted">Project name</span>
                          <input
                            type="text"
                            value={draft.customer_name}
                            onChange={(e) =>
                              setDraftNames((prev) => ({
                                ...prev,
                                [p.id]: {
                                  ...draft,
                                  customer_name: e.target.value,
                                },
                              }))
                            }
                            className="input mt-1 w-full"
                          />
                        </label>
                        <label className="block text-sm">
                          <span className="text-muted">Address</span>
                          <input
                            type="text"
                            value={draft.project_address}
                            onChange={(e) =>
                              setDraftNames((prev) => ({
                                ...prev,
                                [p.id]: {
                                  ...draft,
                                  project_address: e.target.value,
                                },
                              }))
                            }
                            className="input mt-1 w-full"
                          />
                        </label>
                        <button
                          type="button"
                          disabled={savingProjectId === p.id}
                          onClick={() => saveProjectName(p.id)}
                          className="btn-secondary text-sm px-3 py-2 min-h-[40px]"
                        >
                          {savingProjectId === p.id ? 'Saving…' : 'Save name'}
                        </button>
                      </div>

                      <ProjectStatusWorkflowEditor projectId={p.id} />
                      <ProjectFileCategoriesEditor projectId={p.id} />
                      <ProjectClientPanel projectId={p.id} />
                      <ProjectWorkerPanel projectId={p.id} />
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}

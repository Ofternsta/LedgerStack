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
import { ORG_NAME_MAX_LENGTH } from '@/lib/organization-name'
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

type OrganizationSettingsPanelProps = {
  onOrganizationRenamed?: (name: string) => void
  canManageTeam?: boolean
  canManageProjectClients?: boolean
}

export function OrganizationSettingsPanel({
  onOrganizationRenamed,
  canManageTeam = false,
  canManageProjectClients = false,
}: OrganizationSettingsPanelProps = {}) {
  const [organizationName, setOrganizationName] = useState('')
  const [organizationNameDraft, setOrganizationNameDraft] = useState('')
  const [editingOrganizationName, setEditingOrganizationName] = useState(false)
  const [savingOrganizationName, setSavingOrganizationName] = useState(false)
  const [workerDefaults, setWorkerDefaults] = useState<WorkerPermissions>({
    ...DEFAULT_WORKER_PERMISSIONS,
  })
  const [projects, setProjects] = useState<ProjectRow[]>([])
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [savingWorkers, setSavingWorkers] = useState(false)
  const [editingWorkerDefaults, setEditingWorkerDefaults] = useState(false)
  const [workerDefaultsDraft, setWorkerDefaultsDraft] =
    useState<WorkerPermissions>({ ...DEFAULT_WORKER_PERMISSIONS })
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
    setWorkerDefaultsDraft(
      parseDefaultWorkerPermissions(settingsPayload.default_worker_permissions)
    )
    setEditingWorkerDefaults(false)

    const loadedName = String(settingsPayload.name || '').trim()
    setOrganizationName(loadedName)
    setOrganizationNameDraft(loadedName)
    setEditingOrganizationName(false)

    const rows = (projectsPayload.projects || []) as ProjectRow[]
    setProjects(rows)
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function saveWorkerDefaults() {
    setSavingWorkers(true)
    setMessage(null)
    setError(null)

    const res = await fetch('/api/org/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ default_worker_permissions: workerDefaultsDraft }),
    })
    const payload = await res.json().catch(() => ({}))

    if (!res.ok) {
      setError(payload.error || 'Could not save worker defaults')
    } else {
      const saved =
        payload.default_worker_permissions ?? workerDefaultsDraft
      setWorkerDefaults(saved)
      setWorkerDefaultsDraft(saved)
      setEditingWorkerDefaults(false)
      setMessage('Default worker permissions saved.')
    }
    setSavingWorkers(false)
  }

  function startEditingWorkerDefaults() {
    setWorkerDefaultsDraft({ ...workerDefaults })
    setEditingWorkerDefaults(true)
    setMessage(null)
    setError(null)
  }

  function cancelEditingWorkerDefaults() {
    setWorkerDefaultsDraft({ ...workerDefaults })
    setEditingWorkerDefaults(false)
  }

  function startEditingOrganizationName() {
    setOrganizationNameDraft(organizationName)
    setEditingOrganizationName(true)
    setMessage(null)
    setError(null)
  }

  function cancelEditingOrganizationName() {
    setOrganizationNameDraft(organizationName)
    setEditingOrganizationName(false)
  }

  async function saveOrganizationName() {
    const trimmed = organizationNameDraft.trim().replace(/\s+/g, ' ')
    if (!trimmed || trimmed.length > ORG_NAME_MAX_LENGTH) {
      setError(
        `Organization name is required (max ${ORG_NAME_MAX_LENGTH} characters).`
      )
      return
    }

    setSavingOrganizationName(true)
    setMessage(null)
    setError(null)

    const res = await fetch('/api/org/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: trimmed }),
    })
    const payload = await res.json().catch(() => ({}))

    if (!res.ok) {
      setError(payload.error || 'Could not save organization name')
      setSavingOrganizationName(false)
      return
    }

    const saved = String(payload.name || trimmed).trim()
    setOrganizationName(saved)
    setOrganizationNameDraft(saved)
    setEditingOrganizationName(false)
    setMessage('Organization name saved.')
    onOrganizationRenamed?.(saved)
    setSavingOrganizationName(false)
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

      <section className="card p-4 space-y-4">
        <h2 className="font-bold text-foreground">Projects</h2>
        <p className="text-sm text-muted">
          Customize job status stages and file categories per project
          {canManageTeam || canManageProjectClients
            ? ', and manage client and worker access.'
            : '.'}
          {!canManageTeam && !canManageProjectClients && (
            <>
              {' '}
              Worker and client accounts require a Professional or Enterprise
              plan.
            </>
          )}
        </p>

        {projects.length === 0 ? (
          <p className="text-sm text-muted">No projects yet.</p>
        ) : (
          <ul className="space-y-3">
            {projects.map((p) => {
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
                      {canManageTeam && (
                        <ProjectWorkerPanel projectId={p.id} />
                      )}
                      {canManageProjectClients && (
                        <ProjectClientPanel projectId={p.id} />
                      )}

                      <ProjectStatusWorkflowEditor projectId={p.id} />
                      <ProjectFileCategoriesEditor projectId={p.id} />
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {canManageTeam && (
      <section className="card p-4 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-bold text-foreground">Default worker access</h2>
            <p className="text-sm text-muted mt-1">
              Applied when you approve new workers. Adjust per project above.
            </p>
          </div>
          {!editingWorkerDefaults && (
            <button
              type="button"
              onClick={startEditingWorkerDefaults}
              className="btn-secondary text-sm px-4 py-2 min-h-[40px] shrink-0"
            >
              Edit
            </button>
          )}
        </div>

        {editingWorkerDefaults ? (
          <>
            <div className="space-y-3">
              {PERM_KEYS.map((key) => (
                <label
                  key={key}
                  className="flex items-start gap-3 text-sm cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={workerDefaultsDraft[key]}
                    onChange={(e) =>
                      setWorkerDefaultsDraft((prev) => ({
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
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={savingWorkers}
                onClick={() => void saveWorkerDefaults()}
                className="btn-primary px-4 py-2 text-sm min-h-[44px]"
              >
                {savingWorkers ? 'Saving…' : 'Save'}
              </button>
              <button
                type="button"
                disabled={savingWorkers}
                onClick={cancelEditingWorkerDefaults}
                className="btn-secondary px-4 py-2 text-sm min-h-[44px]"
              >
                Cancel
              </button>
            </div>
          </>
        ) : (
          <ul className="text-sm text-muted space-y-1">
            {PERM_KEYS.filter((key) => workerDefaults[key]).map((key) => (
              <li key={key}>✓ {WORKER_PERMISSION_LABELS[key].label}</li>
            ))}
            {PERM_KEYS.every((key) => !workerDefaults[key]) && (
              <li>No default permissions enabled.</li>
            )}
          </ul>
        )}
      </section>
      )}

      <section className="card p-4 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-bold text-foreground">Organization name</h2>
            <p className="text-sm text-muted mt-1">
              Shown in the app header, worker invites, and signature emails.
            </p>
          </div>
          {!editingOrganizationName && (
            <button
              type="button"
              onClick={startEditingOrganizationName}
              className="btn-secondary text-sm px-4 py-2 min-h-[40px] shrink-0"
            >
              Edit
            </button>
          )}
        </div>

        {editingOrganizationName ? (
          <>
            <label className="block space-y-1">
              <span className="text-sm text-muted">Company / organization name</span>
              <input
                type="text"
                value={organizationNameDraft}
                onChange={(e) => setOrganizationNameDraft(e.target.value)}
                maxLength={ORG_NAME_MAX_LENGTH}
                className="input w-full"
                placeholder="Acme Contracting"
                autoFocus
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={savingOrganizationName}
                onClick={() => void saveOrganizationName()}
                className="btn-primary px-4 py-2 text-sm min-h-[44px]"
              >
                {savingOrganizationName ? 'Saving…' : 'Save'}
              </button>
              <button
                type="button"
                disabled={savingOrganizationName}
                onClick={cancelEditingOrganizationName}
                className="btn-secondary px-4 py-2 text-sm min-h-[44px]"
              >
                Cancel
              </button>
            </div>
          </>
        ) : (
          <p className="text-sm font-medium text-foreground">
            {organizationName || 'My Company'}
          </p>
        )}
      </section>

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
    </div>
  )
}

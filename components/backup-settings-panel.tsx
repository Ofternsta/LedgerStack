'use client'

import { LegalNotice } from '@/components/legal-notice'
import { useCallback, useEffect, useState } from 'react'

type BackupSettings = {
  backup_enabled: boolean
  backup_frequency: 'daily' | 'weekly'
  backup_on_report_completed: boolean
  last_scheduled_backup_at: string | null
  backup_project_ids: string[]
}

type BackupProject = {
  id: string
  customer_name: string
  project_address: string
}

type BackupRow = {
  id: string
  project_id: string | null
  backup_type: string
  filename: string
  byte_size: number | null
  status: string
  error_message: string | null
  created_at: string
}

function formatBytes(n: number | null) {
  if (!n) return '—'
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

function typeLabel(t: string) {
  if (t === 'scheduled') return 'Scheduled'
  if (t === 'report_completed') return 'Job completed'
  if (t === 'manual') return 'Manual'
  return t
}

export function BackupSettingsPanel({ canManage }: { canManage: boolean }) {
  const [settings, setSettings] = useState<BackupSettings | null>(null)
  const [backups, setBackups] = useState<BackupRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [running, setRunning] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [maxBackups, setMaxBackups] = useState(5)
  const [projectLimit, setProjectLimit] = useState<number>(-1)
  const [projectCount, setProjectCount] = useState<number>(0)
  const [allowedProjects, setAllowedProjects] = useState<BackupProject[]>([])
  const [backupPruneWarning, setBackupPruneWarning] = useState<string | null>(null)
  const [showProjectPicker, setShowProjectPicker] = useState(false)
  const [specificOpen, setSpecificOpen] = useState(false)
  const [specificSelected, setSpecificSelected] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [settingsRes, backupsRes] = await Promise.all([
      fetch('/api/backups/settings'),
      fetch('/api/backups'),
    ])
    const settingsPayload = await settingsRes.json().catch(() => ({}))
    const backupsPayload = await backupsRes.json().catch(() => ({}))

    if (settingsRes.ok) {
      if (!settingsPayload.settings) {
        setError('Backup settings could not be loaded for your organization.')
        setSettings(null)
      } else {
        setSettings(settingsPayload.settings)
      }
      if (typeof settingsPayload.max_backups === 'number') {
        setMaxBackups(settingsPayload.max_backups)
      }
      setProjectLimit(
        typeof settingsPayload.project_limit === 'number'
          ? settingsPayload.project_limit
          : -1
      )
      setProjectCount(
        typeof settingsPayload.project_count === 'number'
          ? settingsPayload.project_count
          : 0
      )
      setAllowedProjects(
        Array.isArray(settingsPayload.allowed_projects)
          ? (settingsPayload.allowed_projects as BackupProject[])
          : []
      )
      setBackupPruneWarning(
        typeof settingsPayload.backup_prune_warning === 'string'
          ? settingsPayload.backup_prune_warning
          : null
      )
    } else {
      setError(
        settingsPayload.error ||
          'Could not load backup settings. Run supabase/automatic-backups.sql.'
      )
    }

    if (backupsRes.ok) {
      setBackups(backupsPayload.backups || [])
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    if (!settings) return
    setSpecificSelected(settings.backup_project_ids || [])
  }, [settings])

  useEffect(() => {
    if (canManage) void load()
  }, [canManage, load])

  async function saveSettings(patch: Partial<BackupSettings>) {
    setSaving(true)
    setError(null)
    setMessage(null)
    const res = await fetch('/api/backups/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    const payload = await res.json().catch(() => ({}))
    setSaving(false)

    if (!res.ok) {
      setError(payload.error || 'Could not save settings')
      return
    }

    setSettings(payload.settings)
    if (typeof payload.max_backups === 'number') {
      setMaxBackups(payload.max_backups)
    }
    setMessage('Backup settings saved.')
  }

  async function runNow() {
    setRunning(true)
    setError(null)
    setMessage(null)
    const res = await fetch('/api/backups/run', { method: 'POST' })
    const payload = await res.json().catch(() => ({}))
    setRunning(false)

    if (!res.ok) {
      setError(payload.error || 'Backup failed')
      return
    }

    setMessage(
      payload.projects_backed_up
        ? `Backed up ${payload.projects_backed_up} project(s).`
        : 'No projects to back up.'
    )
    await load()
  }

  async function runSpecificNow() {
    setRunning(true)
    setError(null)
    setMessage(null)
    const res = await fetch('/api/backups/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'specific',
        project_ids: specificSelected,
      }),
    })
    const payload = await res.json().catch(() => ({}))
    setRunning(false)
    if (!res.ok) {
      setError(payload.error || 'Backup failed')
      return
    }
    setMessage(
      payload.projects_backed_up
        ? `Backed up ${payload.projects_backed_up} selected project(s).`
        : 'No selected projects to back up.'
    )
    await load()
  }

  function toggleId(list: string[], id: string) {
    return list.includes(id) ? list.filter((x) => x !== id) : [...list, id]
  }

  async function removeBackup(id: string, filename: string) {
    if (
      !window.confirm(
        `Remove backup "${filename}"? This frees space in your ${maxBackups}-backup limit and cannot be undone.`
      )
    ) {
      return
    }

    setDeletingId(id)
    setError(null)
    setMessage(null)

    const res = await fetch(`/api/backups/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    })
    const payload = await res.json().catch(() => ({}))
    setDeletingId(null)

    if (!res.ok) {
      setError(payload.error || 'Could not remove backup')
      return
    }

    setMessage('Backup removed.')
    await load()
  }

  async function downloadBackup(id: string, filename: string) {
    setError(null)
    const res = await fetch(`/api/backups/${encodeURIComponent(id)}/download`)
    if (!res.ok) {
      const payload = await res.json().catch(() => ({}))
      setError(payload.error || 'Download failed')
      return
    }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!canManage) return null

  if (loading) {
    return <p className="text-sm text-muted-dim">Loading backups…</p>
  }

  return (
    <div className="space-y-6">
      <section className="card p-4 sm:p-5 space-y-4">
        <div>
          <h2 className="font-bold text-lg">Automatic backups</h2>
          <p className="text-sm text-muted mt-1 leading-relaxed">
            ZIP copies of each project (jobs, documents, messages, exports) are
            saved to secure cloud storage. Admins can download them anytime. Your
            plan keeps the last {maxBackups} completed backups (older ones are
            removed automatically).
          </p>
        </div>
      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg p-2">
          {error}
        </p>
      )}
      {message && (
        <p className="text-sm text-green-800 bg-green-50 border border-green-100 rounded-lg p-2">
          {message}
        </p>
      )}

      {!settings && !error && (
        <p className="text-sm text-muted">
          Backup settings are unavailable. Run{' '}
          <code className="text-xs">supabase/automatic-backups.sql</code> in Supabase
          SQL Editor, then refresh this page.
        </p>
      )}

      {settings && backupPruneWarning && (
        <p className="text-sm text-amber-900 bg-amber-50 border border-amber-100 rounded-lg p-2">
          {backupPruneWarning}
        </p>
      )}

      {settings && (
        <div className="space-y-3">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="mt-1"
              checked={settings.backup_enabled}
              disabled={saving}
              onChange={(e) =>
                void saveSettings({ backup_enabled: e.target.checked })
              }
            />
            <span className="text-sm">
              <span className="font-medium text-foreground">
                Enable automatic backups
              </span>
              <span className="block text-muted-dim text-xs mt-0.5">
                Runs on a schedule and when jobs are marked completed.
              </span>
            </span>
          </label>

          {settings.backup_enabled && (
            <div className="rounded-lg border border-border bg-surface p-3 space-y-2">
              <button
                type="button"
                onClick={() => setShowProjectPicker((v) => !v)}
                className="text-sm border border-border px-3 py-1.5 rounded-lg min-h-[36px]"
              >
                {showProjectPicker ? 'Hide project selection' : 'Choose projects for automatic backups'}
              </button>
              <p className="text-xs text-muted-dim">
                Select up to{' '}
                {projectLimit < 0 ? allowedProjects.length : projectLimit} project(s).
                If none are selected, automatic backups include all allowed projects.
              </p>
              {showProjectPicker && (
                <div className="space-y-2 max-h-[220px] overflow-y-auto border border-border rounded-lg p-2">
                  {allowedProjects.map((p) => {
                    const checked = settings.backup_project_ids.includes(p.id)
                    return (
                      <label key={p.id} className="flex items-start gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const next = e.target.checked
                              ? [...settings.backup_project_ids, p.id]
                              : settings.backup_project_ids.filter((id) => id !== p.id)
                            setSettings({ ...settings, backup_project_ids: next })
                          }}
                        />
                        <span>
                          <span className="font-medium text-foreground">{p.customer_name}</span>
                          <span className="block text-xs text-muted-dim">{p.project_address}</span>
                        </span>
                      </label>
                    )
                  })}
                </div>
              )}
              <button
                type="button"
                disabled={saving}
                onClick={() =>
                  void saveSettings({ backup_project_ids: settings.backup_project_ids })
                }
                className="text-sm border border-border px-3 py-1.5 rounded-lg min-h-[36px] disabled:opacity-50"
              >
                Save project selection
              </button>
            </div>
          )}

          <label className="block space-y-1">
            <span className="text-xs font-semibold text-muted uppercase tracking-wide">
              Schedule
            </span>
            <select
              className="input-field w-full text-sm"
              value={settings.backup_frequency}
              disabled={saving || !settings.backup_enabled}
              onChange={(e) =>
                void saveSettings({
                  backup_frequency: e.target.value as 'daily' | 'weekly',
                })
              }
            >
              <option value="weekly">Weekly (recommended)</option>
              <option value="daily">Daily</option>
            </select>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="mt-1"
              checked={settings.backup_on_report_completed}
              disabled={saving || !settings.backup_enabled}
              onChange={(e) =>
                void saveSettings({
                  backup_on_report_completed: e.target.checked,
                })
              }
            />
            <span className="text-sm text-foreground">
              Back up project when a job is marked{' '}
              <strong>Completed</strong>
            </span>
          </label>

          {settings.last_scheduled_backup_at && (
            <p className="text-xs text-muted-dim">
              Last scheduled run:{' '}
              {new Date(settings.last_scheduled_backup_at).toLocaleString()}
            </p>
          )}

          <button
            type="button"
            disabled={running}
            onClick={runNow}
            className="text-sm border border-border px-4 py-2 rounded-lg font-medium min-h-[44px] disabled:opacity-50"
          >
            {running ? 'Backing up…' : 'Back up all projects now'}
          </button>
          <button
            type="button"
            disabled={running}
            onClick={() => setSpecificOpen((v) => !v)}
            className="ml-2 text-sm border border-border px-4 py-2 rounded-lg font-medium min-h-[44px] disabled:opacity-50"
          >
            Back up specific projects
          </button>
          {specificOpen && (
            <div className="mt-2 space-y-2 rounded-lg border border-border p-3 bg-surface">
              <p className="text-xs text-muted-dim">
                Select up to {projectLimit < 0 ? allowedProjects.length : projectLimit} project(s)
                for this manual run.
              </p>
              {projectCount > allowedProjects.length && (
                <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded p-2">
                  This account has {projectCount} projects but this plan currently allows
                  selecting {allowedProjects.length} project(s) for manual backups.
                </p>
              )}
              <div className="space-y-2 max-h-[220px] overflow-y-auto border border-border rounded-lg p-2">
                {allowedProjects.map((p) => {
                  const checked = specificSelected.includes(p.id)
                  return (
                    <label key={p.id} className="flex items-start gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setSpecificSelected((prev) => toggleId(prev, p.id))
                        }
                      />
                      <span>
                        <span className="font-medium text-foreground">{p.customer_name}</span>
                        <span className="block text-xs text-muted-dim">{p.project_address}</span>
                      </span>
                    </label>
                  )
                })}
              </div>
              <button
                type="button"
                disabled={running || specificSelected.length === 0}
                onClick={runSpecificNow}
                className="text-sm border border-border px-4 py-2 rounded-lg font-medium min-h-[40px] disabled:opacity-50"
              >
                {running ? 'Backing up…' : 'Run specific backup now'}
              </button>
            </div>
          )}
        </div>
      )}
      </section>

      <section className="flex-1 min-h-0">
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
          <h2 className="font-bold text-lg">Your backups</h2>
          {backups.length > 0 && (
            <p className="text-sm text-muted">
              {backups.length} backup{backups.length === 1 ? '' : 's'}
            </p>
          )}
        </div>

        {backups.length === 0 ? (
          <p className="text-muted-dim text-center py-12">
            No backups yet. Enable automatic backups above or run a manual backup.
          </p>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {backups.map((b) => (
              <li
                key={b.id}
                className="border border-border rounded-xl bg-surface-elevated shadow-sm overflow-hidden flex flex-col min-h-[140px]"
              >
                <div className="p-4 flex-1 text-center">
                  <p className="font-bold text-xl sm:text-2xl text-brand-bright leading-snug line-clamp-2 break-all">
                    {b.filename}
                  </p>
                  <p className="text-sm text-muted mt-2 leading-snug">
                    {typeLabel(b.backup_type)}
                  </p>
                  <p className="text-xs text-muted-dim mt-1">
                    {new Date(b.created_at).toLocaleString(undefined, {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </p>
                  <p className="text-xs text-muted-dim mt-0.5">
                    {formatBytes(b.byte_size)} · {b.status}
                  </p>
                  {b.error_message && (
                    <p className="text-xs text-red-600 mt-2 line-clamp-2">
                      {b.error_message}
                    </p>
                  )}
                </div>
                <div className="border-t border-border px-4 py-2.5 flex flex-wrap items-center justify-center gap-3">
                  {b.status === 'completed' && (
                    <button
                      type="button"
                      onClick={() => downloadBackup(b.id, b.filename)}
                      className="text-sm font-medium text-brand-bright min-h-[40px]"
                    >
                      Download
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={deletingId === b.id}
                    onClick={() => removeBackup(b.id, b.filename)}
                    className="text-sm font-medium text-red-500 min-h-[40px] disabled:opacity-50"
                  >
                    {deletingId === b.id ? 'Removing…' : 'Remove'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <LegalNotice id="export-backup" />
      <LegalNotice id="data-retention" />
    </div>
  )
}

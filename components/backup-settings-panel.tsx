'use client'

import { LegalNotice } from '@/components/legal-notice'
import { useCallback, useEffect, useState } from 'react'

type BackupSettings = {
  backup_enabled: boolean
  backup_frequency: 'daily' | 'weekly'
  backup_on_report_completed: boolean
  last_scheduled_backup_at: string | null
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
      setSettings(settingsPayload.settings || null)
      if (typeof settingsPayload.max_backups === 'number') {
        setMaxBackups(settingsPayload.max_backups)
      }
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
    <section className="border border-border rounded-xl p-4 bg-surface-elevated space-y-4">
      <div>
        <h2 className="font-bold text-lg">Automatic backups</h2>
        <p className="text-sm text-muted mt-1 leading-relaxed">
          ZIP copies of each project (jobs, documents, messages, exports) are
          saved to secure cloud storage. Admins can download them anytime. Your plan
          keeps the last {maxBackups} completed backups (older ones are removed
          automatically).
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
        </div>
      )}

      <div className="pt-2 border-t border-border space-y-2">
        <h3 className="text-sm font-semibold text-foreground">Recent backups</h3>
        {backups.length === 0 ? (
          <p className="text-sm text-muted-dim">No backups yet.</p>
        ) : (
          <ul className="space-y-2 max-h-[280px] overflow-y-auto">
            {backups.map((b) => (
              <li
                key={b.id}
                className="border border-border rounded-lg p-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{b.filename}</p>
                  <p className="text-xs text-muted-dim">
                    {typeLabel(b.backup_type)} ·{' '}
                    {new Date(b.created_at).toLocaleString()} ·{' '}
                    {formatBytes(b.byte_size)} · {b.status}
                  </p>
                  {b.error_message && (
                    <p className="text-xs text-red-700 truncate">
                      {b.error_message}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  {b.status === 'completed' && (
                    <button
                      type="button"
                      onClick={() => downloadBackup(b.id, b.filename)}
                      className="text-sm text-brand-bright font-medium min-h-[40px]"
                    >
                      Download
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={deletingId === b.id}
                    onClick={() => removeBackup(b.id, b.filename)}
                    className="text-sm text-red-600 font-medium min-h-[40px] disabled:opacity-50"
                  >
                    {deletingId === b.id ? 'Removing…' : 'Remove'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <LegalNotice id="export-backup" />
      <LegalNotice id="data-retention" />
    </section>
  )
}

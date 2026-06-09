'use client'

import { useEffect, useState } from 'react'
import {
  COMPLETED_STATUS_KEY,
  DEFAULT_STATUS_WORKFLOW,
  MAX_STATUS_STAGES,
  slugifyStatusKey,
  type StatusStage,
} from '@/lib/project-status-workflow'

type Props = {
  projectId: string
  onSaved?: () => void
}

export function ProjectStatusWorkflowEditor({ projectId, onSaved }: Props) {
  const [stages, setStages] = useState<StatusStage[]>([])
  const [draft, setDraft] = useState<StatusStage[]>([])
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const res = await fetch(`/api/projects/${projectId}/workflow`)
      const payload = await res.json().catch(() => ({}))
      const loaded = res.ok && payload.workflow
        ? (payload.workflow as StatusStage[])
        : DEFAULT_STATUS_WORKFLOW.map((s) => ({ ...s }))
      setStages(loaded)
      setDraft(loaded.map((s) => ({ ...s })))
      setEditing(false)
      setLoading(false)
    }
    void load()
  }, [projectId])

  const nonCompleted = draft.filter((s) => s.key !== COMPLETED_STATUS_KEY)
  const completed =
    draft.find((s) => s.key === COMPLETED_STATUS_KEY) ??
    ({ key: COMPLETED_STATUS_KEY, label: 'Completed' } satisfies StatusStage)

  function updateNonCompleted(index: number, label: string) {
    setDraft((prev) => {
      const nc = prev.filter((s) => s.key !== COMPLETED_STATUS_KEY)
      const comp =
        prev.find((s) => s.key === COMPLETED_STATUS_KEY) ??
        ({ key: COMPLETED_STATUS_KEY, label: 'Completed' } satisfies StatusStage)
      const next = [...nc]
      next[index] = { ...next[index], label }
      return [...next, comp]
    })
  }

  function addStage() {
    if (nonCompleted.length >= MAX_STATUS_STAGES - 1) return
    setDraft((prev) => {
      const nc = prev.filter((s) => s.key !== COMPLETED_STATUS_KEY)
      const comp =
        prev.find((s) => s.key === COMPLETED_STATUS_KEY) ??
        ({ key: COMPLETED_STATUS_KEY, label: 'Completed' } satisfies StatusStage)
      const keys = new Set(nc.map((s) => s.key))
      const label = `Stage ${nc.length + 1}`
      const key = slugifyStatusKey(label, keys)
      return [...nc, { key, label }, comp]
    })
  }

  function removeStage(index: number) {
    if (nonCompleted.length <= 1) return
    setDraft((prev) => {
      const nc = prev.filter((s) => s.key !== COMPLETED_STATUS_KEY)
      const comp =
        prev.find((s) => s.key === COMPLETED_STATUS_KEY) ??
        ({ key: COMPLETED_STATUS_KEY, label: 'Completed' } satisfies StatusStage)
      nc.splice(index, 1)
      return [...nc, comp]
    })
  }

  function startEdit() {
    setDraft(stages.map((s) => ({ ...s })))
    setEditing(true)
    setError(null)
    setMessage(null)
  }

  function cancelEdit() {
    setDraft(stages.map((s) => ({ ...s })))
    setEditing(false)
    setError(null)
  }

  async function save() {
    setSaving(true)
    setError(null)
    setMessage(null)

    const res = await fetch(`/api/projects/${projectId}/workflow`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stages: draft }),
    })
    const payload = await res.json().catch(() => ({}))
    setSaving(false)

    if (!res.ok) {
      setError(payload.error || 'Could not save workflow')
      return
    }

    const saved = payload.workflow as StatusStage[]
    setStages(saved)
    setDraft(saved.map((s) => ({ ...s })))
    setEditing(false)
    setMessage('Job status stages saved.')
    onSaved?.()
  }

  if (loading) {
    return <p className="text-xs text-muted">Loading status stages…</p>
  }

  return (
    <section className="space-y-3 border border-border rounded-lg p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Job status stages</h3>
          <p className="text-xs text-muted mt-0.5">
            Customize stages for this project. The final Completed stage stays last.
          </p>
        </div>
        {!editing && (
          <button
            type="button"
            onClick={startEdit}
            className="btn-secondary text-sm px-3 py-2 min-h-[40px] shrink-0"
          >
            Edit
          </button>
        )}
      </div>

      {editing ? (
        <>
          <ul className="space-y-2">
            {nonCompleted.map((stage, index) => (
              <li key={stage.key} className="flex gap-2 items-center">
                <span className="text-xs text-muted-dim w-5 shrink-0">
                  {index + 1}
                </span>
                <input
                  type="text"
                  value={stage.label}
                  onChange={(e) => updateNonCompleted(index, e.target.value)}
                  className="input flex-1 text-sm"
                  maxLength={48}
                />
                <button
                  type="button"
                  disabled={nonCompleted.length <= 1}
                  onClick={() => removeStage(index)}
                  className="text-xs text-red-600 px-2 min-h-[40px] disabled:opacity-40"
                >
                  Remove
                </button>
              </li>
            ))}
            <li className="flex gap-2 items-center">
              <span className="text-xs text-muted-dim w-5 shrink-0">
                {nonCompleted.length + 1}
              </span>
              <input
                type="text"
                value={completed.label}
                onChange={(e) =>
                  setDraft((prev) => {
                    const nc = prev.filter((s) => s.key !== COMPLETED_STATUS_KEY)
                    return [
                      ...nc,
                      {
                        key: COMPLETED_STATUS_KEY,
                        label: e.target.value,
                      },
                    ]
                  })
                }
                className="input flex-1 text-sm"
                maxLength={48}
              />
              <span className="text-xs text-muted-dim shrink-0">Final</span>
            </li>
          </ul>

          {nonCompleted.length < MAX_STATUS_STAGES - 1 && (
            <button
              type="button"
              onClick={addStage}
              className="text-sm text-brand-bright font-medium min-h-[40px]"
            >
              + Add stage
            </button>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => void save()}
              className="btn-primary text-sm px-3 py-2 min-h-[40px]"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={cancelEdit}
              className="btn-secondary text-sm px-3 py-2 min-h-[40px]"
            >
              Cancel
            </button>
          </div>
        </>
      ) : (
        <ol className="text-sm text-muted space-y-1 list-decimal pl-5">
          {stages.map((stage) => (
            <li key={stage.key}>
              {stage.label}
              {stage.key === COMPLETED_STATUS_KEY && (
                <span className="text-xs text-muted-dim"> (final)</span>
              )}
            </li>
          ))}
        </ol>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}
      {message && !editing && <p className="text-xs text-green-700">{message}</p>}
    </section>
  )
}

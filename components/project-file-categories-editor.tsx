'use client'

import { useEffect, useState } from 'react'
import {
  defaultFileCategories,
  MAX_FILE_CATEGORIES,
  slugifyFileCategoryKey,
  type FileCategory,
} from '@/lib/project-file-categories'

type Props = {
  projectId: string
  onSaved?: () => void
}

export function ProjectFileCategoriesEditor({ projectId, onSaved }: Props) {
  const [categories, setCategories] = useState<FileCategory[]>([])
  const [draft, setDraft] = useState<FileCategory[]>([])
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const res = await fetch(`/api/projects/${projectId}/file-categories`)
      const payload = await res.json().catch(() => ({}))
      const loaded = res.ok && payload.categories
        ? (payload.categories as FileCategory[])
        : defaultFileCategories()
      setCategories(loaded)
      setDraft(loaded.map((c) => ({ ...c })))
      setEditing(false)
      setLoading(false)
    }
    void load()
  }, [projectId])

  function updateLabel(index: number, label: string) {
    setDraft((prev) =>
      prev.map((c, i) => (i === index ? { ...c, label } : c))
    )
  }

  function addCategory() {
    if (draft.length >= MAX_FILE_CATEGORIES) return
    setDraft((prev) => {
      const keys = new Set(prev.map((c) => c.key))
      const label = `Category ${prev.length + 1}`
      return [...prev, { key: slugifyFileCategoryKey(label, keys), label }]
    })
  }

  function removeCategory(index: number) {
    if (draft.length <= 1) return
    setDraft((prev) => prev.filter((_, i) => i !== index))
  }

  function startEdit() {
    setDraft(categories.map((c) => ({ ...c })))
    setEditing(true)
    setError(null)
    setMessage(null)
  }

  function cancelEdit() {
    setDraft(categories.map((c) => ({ ...c })))
    setEditing(false)
    setError(null)
  }

  async function save() {
    setSaving(true)
    setError(null)
    setMessage(null)

    const res = await fetch(`/api/projects/${projectId}/file-categories`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categories: draft }),
    })
    const payload = await res.json().catch(() => ({}))
    setSaving(false)

    if (!res.ok) {
      setError(payload.error || 'Could not save categories')
      return
    }

    const saved = payload.categories as FileCategory[]
    setCategories(saved)
    setDraft(saved.map((c) => ({ ...c })))
    setEditing(false)
    setMessage('File categories saved.')
    onSaved?.()
  }

  if (loading) {
    return <p className="text-xs text-muted">Loading file categories…</p>
  }

  return (
    <section className="space-y-3 border border-border rounded-lg p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">File categories</h3>
          <p className="text-xs text-muted mt-0.5">
            Customize document folders for this project. Uploads and AI sorting use
            these names.
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
            {draft.map((cat, index) => (
              <li key={cat.key} className="flex gap-2 items-center">
                <span className="text-xs text-muted-dim w-5 shrink-0">
                  {index + 1}
                </span>
                <input
                  type="text"
                  value={cat.label}
                  onChange={(e) => updateLabel(index, e.target.value)}
                  className="input flex-1 text-sm"
                  maxLength={48}
                />
                <button
                  type="button"
                  disabled={draft.length <= 1}
                  onClick={() => removeCategory(index)}
                  className="text-xs text-red-600 px-2 min-h-[40px] disabled:opacity-40"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>

          {draft.length < MAX_FILE_CATEGORIES && (
            <button
              type="button"
              onClick={addCategory}
              className="text-sm text-brand-bright font-medium min-h-[40px]"
            >
              + Add category
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
        <ul className="text-sm text-muted space-y-1 list-disc pl-5">
          {categories.map((cat) => (
            <li key={cat.key}>{cat.label}</li>
          ))}
        </ul>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}
      {message && !editing && <p className="text-xs text-green-700">{message}</p>}
    </section>
  )
}

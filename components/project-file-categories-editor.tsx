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
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const res = await fetch(`/api/projects/${projectId}/file-categories`)
      const payload = await res.json().catch(() => ({}))
      if (res.ok && payload.categories) {
        setCategories(payload.categories as FileCategory[])
      } else {
        setCategories(defaultFileCategories())
      }
      setLoading(false)
    }
    void load()
  }, [projectId])

  function updateLabel(index: number, label: string) {
    setCategories((prev) =>
      prev.map((c, i) => (i === index ? { ...c, label } : c))
    )
  }

  function addCategory() {
    if (categories.length >= MAX_FILE_CATEGORIES) return
    setCategories((prev) => {
      const keys = new Set(prev.map((c) => c.key))
      const label = `Category ${prev.length + 1}`
      return [...prev, { key: slugifyFileCategoryKey(label, keys), label }]
    })
  }

  function removeCategory(index: number) {
    if (categories.length <= 1) return
    setCategories((prev) => prev.filter((_, i) => i !== index))
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setMessage(null)

    const res = await fetch(`/api/projects/${projectId}/file-categories`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categories }),
    })
    const payload = await res.json().catch(() => ({}))
    setSaving(false)

    if (!res.ok) {
      setError(payload.error || 'Could not save categories')
      return
    }

    setCategories(payload.categories as FileCategory[])
    setMessage('File categories saved.')
    onSaved?.()
  }

  if (loading) {
    return <p className="text-xs text-muted">Loading file categories…</p>
  }

  return (
    <form onSubmit={save} className="space-y-3 border border-border rounded-lg p-3">
      <h3 className="text-sm font-semibold text-foreground">File categories</h3>
      <p className="text-xs text-muted">
        Customize document folders for this project. Uploads and AI sorting use
        these names.
      </p>

      <ul className="space-y-2">
        {categories.map((cat, index) => (
          <li key={cat.key} className="flex gap-2 items-center">
            <span className="text-xs text-muted-dim w-5 shrink-0">{index + 1}</span>
            <input
              type="text"
              value={cat.label}
              onChange={(e) => updateLabel(index, e.target.value)}
              className="input flex-1 text-sm"
              maxLength={48}
            />
            <button
              type="button"
              disabled={categories.length <= 1}
              onClick={() => removeCategory(index)}
              className="text-xs text-red-600 px-2 min-h-[40px] disabled:opacity-40"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>

      {categories.length < MAX_FILE_CATEGORIES && (
        <button
          type="button"
          onClick={addCategory}
          className="text-sm text-brand-bright font-medium min-h-[40px]"
        >
          + Add category
        </button>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}
      {message && <p className="text-xs text-green-700">{message}</p>}

      <button
        type="submit"
        disabled={saving}
        className="btn-secondary text-sm px-3 py-2 min-h-[40px]"
      >
        {saving ? 'Saving…' : 'Save categories'}
      </button>
    </form>
  )
}

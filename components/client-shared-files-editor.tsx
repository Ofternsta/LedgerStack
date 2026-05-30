'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  defaultFileCategories,
  normalizeFileCategoryLabel,
  type FileCategory,
} from '@/lib/project-file-categories'

type ShareFile = {
  file_path: string
  file_name: string
  evidence_type: string
  claim_id: string
}

type Props = {
  projectId: string
  accessId: string
  clientEmail: string
}

export function ClientSharedFilesEditor({
  projectId,
  accessId,
  clientEmail,
}: Props) {
  const [files, setFiles] = useState<ShareFile[]>([])
  const [categories, setCategories] = useState<FileCategory[]>(
    defaultFileCategories()
  )
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedMessage, setSavedMessage] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const params = new URLSearchParams({
      project_id: projectId,
      access_id: accessId,
    })
    const res = await fetch(`/api/project-access/shared-files?${params}`)
    const payload = await res.json().catch(() => ({}))

    if (!res.ok) {
      setError(payload.error || 'Could not load files')
      setFiles([])
      setSelected(new Set())
      setLoading(false)
      return
    }

    const list = (payload.files || []) as ShareFile[]
    setFiles(list)
    setSelected(new Set((payload.shared_paths || []) as string[]))
    if (payload.categories?.length) {
      setCategories(payload.categories as FileCategory[])
    }
    setLoading(false)
  }, [projectId, accessId])

  useEffect(() => {
    void load()
  }, [load])

  const grouped = useMemo(() => {
    const map = Object.fromEntries(
      categories.map((c) => [c.key, [] as ShareFile[]])
    ) as Record<string, ShareFile[]>

    for (const file of files) {
      const label = normalizeFileCategoryLabel(file.evidence_type, categories)
      const cat =
        categories.find((c) => c.label === label) ?? categories[0]
      map[cat.key].push(file)
    }

    return categories
      .map((cat) => ({
        type: cat,
        files: map[cat.key],
      }))
      .filter((g) => g.files.length > 0)
  }, [files, categories])

  function folderState(folderFiles: ShareFile[]) {
    const paths = folderFiles.map((f) => f.file_path)
    const selectedCount = paths.filter((p) => selected.has(p)).length
    if (selectedCount === 0) return 'unchecked' as const
    if (selectedCount === paths.length) return 'checked' as const
    return 'indeterminate' as const
  }

  function toggleFolder(key: string) {
    setExpandedFolders((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function toggleFile(path: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  function toggleFolderSelectAll(folderFiles: ShareFile[]) {
    const state = folderState(folderFiles)
    const paths = folderFiles.map((f) => f.file_path)
    setSelected((prev) => {
      const next = new Set(prev)
      if (state === 'checked') {
        for (const p of paths) next.delete(p)
      } else {
        for (const p of paths) next.add(p)
      }
      return next
    })
  }

  async function save() {
    setSaving(true)
    setError(null)
    setSavedMessage(null)

    const res = await fetch('/api/project-access/shared-files', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_id: projectId,
        access_id: accessId,
        file_paths: [...selected],
      }),
    })
    const payload = await res.json().catch(() => ({}))
    setSaving(false)

    if (!res.ok) {
      setError(payload.error || 'Could not save')
      return
    }

    setSavedMessage(`Shared ${payload.shared_count ?? selected.size} file(s).`)
  }

  if (loading) {
    return <p className="text-sm text-muted">Loading files…</p>
  }

  if (!files.length) {
    return (
      <p className="text-sm text-muted">
        No project files to share yet. Upload documents on the project first.
      </p>
    )
  }

  return (
    <div className="space-y-3 border border-border rounded-lg p-3">
      <p className="text-sm text-muted">
        Choose which files <strong>{clientEmail}</strong> can open. Grouped by
        your project&apos;s file categories.
      </p>

      {grouped.map(({ type, files: folderFiles }) => {
        const folderStateVal = folderState(folderFiles)
        const isOpen = expandedFolders.has(type.key)

        return (
          <div
            key={type.key}
            className="border border-border rounded-lg overflow-hidden"
          >
            <div className="flex items-center gap-2 px-3 py-2 bg-surface">
              <input
                type="checkbox"
                checked={folderStateVal === 'checked'}
                ref={(el) => {
                  if (el) el.indeterminate = folderStateVal === 'indeterminate'
                }}
                onChange={() => toggleFolderSelectAll(folderFiles)}
                className="mt-0.5"
              />
              <button
                type="button"
                onClick={() => toggleFolder(type.key)}
                className="flex-1 text-left text-sm font-semibold min-h-[40px]"
              >
                {type.label} ({folderFiles.length})
              </button>
              <span className="text-muted-dim text-xs">{isOpen ? '▾' : '▸'}</span>
            </div>

            {isOpen && (
              <ul className="divide-y divide-border">
                {folderFiles.map((f) => (
                  <li key={f.file_path}>
                    <label className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-surface-elevated min-h-[44px]">
                      <input
                        type="checkbox"
                        checked={selected.has(f.file_path)}
                        onChange={() => toggleFile(f.file_path)}
                      />
                      <span className="truncate">{f.file_name}</span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )
      })}

      {error && <p className="text-sm text-red-600">{error}</p>}
      {savedMessage && (
        <p className="text-sm text-green-700">{savedMessage}</p>
      )}

      <button
        type="button"
        disabled={saving}
        onClick={save}
        className="btn-primary text-[#052e16] text-sm px-4 py-2 min-h-[44px] w-full disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save shared files'}
      </button>
    </div>
  )
}

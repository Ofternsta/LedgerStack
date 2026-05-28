'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  EVIDENCE_TYPES,
  normalizeEvidenceType,
  type EvidenceType,
} from '@/lib/evidence-types'

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

function folderKey(type: string): EvidenceType {
  return normalizeEvidenceType(type)
}

export function ClientSharedFilesEditor({
  projectId,
  accessId,
  clientEmail,
}: Props) {
  const [files, setFiles] = useState<ShareFile[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [expandedFolders, setExpandedFolders] = useState<Set<EvidenceType>>(
    new Set()
  )
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
    setLoading(false)
  }, [projectId, accessId])

  useEffect(() => {
    void load()
  }, [load])

  const grouped = useMemo(() => {
    const map = Object.fromEntries(
      EVIDENCE_TYPES.map((t) => [t, [] as ShareFile[]])
    ) as Record<EvidenceType, ShareFile[]>

    for (const file of files) {
      map[folderKey(file.evidence_type)].push(file)
    }

    return EVIDENCE_TYPES.map((type) => ({
      type,
      files: map[type],
    })).filter((g) => g.files.length > 0)
  }, [files])

  function folderState(type: EvidenceType, folderFiles: ShareFile[]) {
    const paths = folderFiles.map((f) => f.file_path)
    const selectedCount = paths.filter((p) => selected.has(p)).length
    if (selectedCount === 0) return 'unchecked' as const
    if (selectedCount === paths.length) return 'checked' as const
    return 'indeterminate' as const
  }

  function toggleFolder(type: EvidenceType, folderFiles: ShareFile[]) {
    const paths = folderFiles.map((f) => f.file_path)
    const state = folderState(type, folderFiles)
    setSelected((prev) => {
      const next = new Set(prev)
      if (state === 'checked') {
        paths.forEach((p) => next.delete(p))
      } else {
        paths.forEach((p) => next.add(p))
      }
      return next
    })
    setSavedMessage(null)
  }

  function toggleFile(filePath: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(filePath)) next.delete(filePath)
      else next.add(filePath)
      return next
    })
    setSavedMessage(null)
  }

  function toggleFolderExpand(type: EvidenceType) {
    setExpandedFolders((prev) => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type)
      else next.add(type)
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

    if (!res.ok) {
      setError(payload.error || 'Could not save shared files')
      setSaving(false)
      return
    }

    setSavedMessage(
      selected.size === 0
        ? 'No files shared with this client.'
        : `Shared ${selected.size} file(s) with ${clientEmail}.`
    )
    setSaving(false)
  }

  if (loading) {
    return <p className="text-sm text-muted-dim py-2">Loading files…</p>
  }

  if (!grouped.length) {
    return (
      <p className="text-sm text-muted-dim py-2">
        No project files to share yet. Upload documents on this project first.
      </p>
    )
  }

  return (
    <div className="space-y-3 border-t border-border pt-3 mt-2">
      <p className="text-xs text-muted">
        Choose which files <span className="font-medium">{clientEmail}</span>{' '}
        can view. Only checked files appear in their portal.
      </p>

      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg p-2">
          {error}
        </p>
      )}
      {savedMessage && (
        <p className="text-sm text-green-800 bg-green-50 border border-green-100 rounded-lg p-2">
          {savedMessage}
        </p>
      )}

      <ul className="space-y-2">
        {grouped.map(({ type, files: folderFiles }) => {
          const state = folderState(type, folderFiles)
          const isOpen = expandedFolders.has(type)

          return (
            <li
              key={type}
              className="border border-border rounded-lg bg-surface overflow-hidden"
            >
              <div className="flex items-center gap-2 px-3 py-2 min-h-[44px]">
                <input
                  type="checkbox"
                  checked={state === 'checked'}
                  ref={(el) => {
                    if (el) el.indeterminate = state === 'indeterminate'
                  }}
                  onChange={() => toggleFolder(type, folderFiles)}
                  aria-label={`Share all ${type} files`}
                  className="h-4 w-4 shrink-0"
                />
                <button
                  type="button"
                  onClick={() => toggleFolderExpand(type)}
                  className="flex-1 text-left font-medium text-sm text-foreground min-h-[44px]"
                >
                  {type}
                  <span className="text-muted-dim font-normal ml-2">
                    ({folderFiles.length})
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => toggleFolderExpand(type)}
                  className="text-muted-dim px-2 min-h-[44px]"
                  aria-expanded={isOpen}
                  aria-label={isOpen ? 'Collapse folder' : 'Expand folder'}
                >
                  {isOpen ? '▾' : '▸'}
                </button>
              </div>

              {isOpen && (
                <ul className="border-t border-border divide-y divide-border">
                  {folderFiles.map((file) => (
                    <li key={file.file_path}>
                      <label className="flex items-start gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-surface-elevated min-h-[44px]">
                        <input
                          type="checkbox"
                          checked={selected.has(file.file_path)}
                          onChange={() => toggleFile(file.file_path)}
                          className="h-4 w-4 mt-0.5 shrink-0"
                        />
                        <span className="min-w-0">
                          <span className="block font-medium truncate">
                            {file.file_name}
                          </span>
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          )
        })}
      </ul>

      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="text-sm font-medium btn-primary text-[#052e16] px-4 py-2 rounded-xl min-h-[44px] disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save shared files'}
      </button>
    </div>
  )
}

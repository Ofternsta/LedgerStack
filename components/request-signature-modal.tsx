'use client'

import { useEffect, useState } from 'react'

type ProjectFile = {
  file_path: string
  file_name: string
}

type Props = {
  projectId: string
  accessId: string
  clientEmail: string
  open: boolean
  onClose: () => void
  onCreated?: () => void
}

export function RequestSignatureModal({
  projectId,
  accessId,
  clientEmail,
  open,
  onClose,
  onCreated,
}: Props) {
  const [files, setFiles] = useState<ProjectFile[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [selectedPath, setSelectedPath] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setMessage(null)
    setSelectedPath('')
    setLoading(true)
    fetch(
      `/api/project-access/shared-files?project_id=${encodeURIComponent(projectId)}&access_id=${encodeURIComponent(accessId)}`
    )
      .then((r) => r.json())
      .then((d) => {
        const pdfs = (d.files || [])
          .filter((f: ProjectFile) =>
            String(f.file_name || '').toLowerCase().endsWith('.pdf')
          )
          .map((f: ProjectFile) => ({
            file_path: f.file_path,
            file_name: f.file_name,
          }))
        setFiles(pdfs)
      })
      .catch(() => setFiles([]))
      .finally(() => setLoading(false))
  }, [open, projectId, accessId])

  if (!open) return null

  async function submit() {
    if (!selectedPath) return
    setSubmitting(true)
    setMessage(null)

    const res = await fetch('/api/signature-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_id: projectId,
        project_client_access_id: accessId,
        source_file_path: selectedPath,
      }),
    })
    const payload = await res.json().catch(() => ({}))

    setSubmitting(false)

    if (!res.ok) {
      setMessage(payload.error || 'Could not request signature')
      return
    }

    setMessage('Signature request sent. The client will be notified by email and in LedgerStack.')
    onCreated?.()
    setTimeout(() => onClose(), 1500)
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-4 bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-label="Request signature"
    >
      <div className="w-full max-w-md bg-surface-elevated border border-border rounded-2xl shadow-xl p-5 space-y-4 max-h-[85vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="font-bold text-lg">Request signature</h2>
            <p className="text-sm text-muted mt-1">
              Send a PDF to <span className="text-foreground">{clientEmail}</span>{' '}
              for a typed electronic signature via SignWell.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted px-2 py-1 rounded-lg hover:bg-surface min-h-[40px]"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-muted-dim">Loading project files…</p>
        ) : files.length === 0 ? (
          <p className="text-sm text-muted-dim">
            No PDF files on this project yet. Upload a PDF first, then request a
            signature.
          </p>
        ) : (
          <ul className="space-y-2 max-h-48 overflow-y-auto">
            {files.map((f) => (
              <li key={f.file_path}>
                <label className="flex items-center gap-3 border border-border rounded-xl p-3 cursor-pointer hover:border-brand-dim/50 min-h-[48px]">
                  <input
                    type="radio"
                    name="signature-file"
                    checked={selectedPath === f.file_path}
                    onChange={() => setSelectedPath(f.file_path)}
                    className="shrink-0"
                  />
                  <span className="text-sm font-medium truncate">{f.file_name}</span>
                </label>
              </li>
            ))}
          </ul>
        )}

        {message && (
          <p
            className={`text-sm rounded-lg px-3 py-2 ${
              message.toLowerCase().includes('could not') ||
              message.toLowerCase().includes('error')
                ? 'text-red-800 bg-red-50 border border-red-100'
                : 'text-green-800 bg-green-50 border border-green-100'
            }`}
          >
            {message}
          </p>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 border border-border py-3 rounded-xl text-sm font-medium min-h-[48px]"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={submitting || !selectedPath}
            onClick={() => void submit()}
            className="flex-1 btn-primary py-3 rounded-xl text-sm font-medium min-h-[48px] disabled:opacity-50"
          >
            {submitting ? 'Sending…' : 'Request signature'}
          </button>
        </div>
      </div>
    </div>
  )
}

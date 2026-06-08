'use client'

import { useEffect, useState } from 'react'

type Project = {
  id: string
  customer_name: string
  project_address: string
}

type Props = {
  projects: Project[]
  open: boolean
  onClose: () => void
  onUpdated: (project: Project) => void
  onDeleted: (projectId: string) => void
}

export function ProjectsEditPanel({
  projects,
  open,
  onClose,
  onUpdated,
  onDeleted,
}: Props) {
  const [selectedId, setSelectedId] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [projectAddress, setProjectAddress] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const selected = projects.find((p) => p.id === selectedId)

  useEffect(() => {
    if (!open) return
    const first = projects[0]
    if (!first) {
      setSelectedId('')
      setCustomerName('')
      setProjectAddress('')
      return
    }
    setSelectedId(first.id)
    setCustomerName(first.customer_name)
    setProjectAddress(first.project_address)
  }, [open, projects])

  useEffect(() => {
    if (!selected) return
    setCustomerName(selected.customer_name)
    setProjectAddress(selected.project_address)
  }, [selected?.id, selected?.customer_name, selected?.project_address])

  if (!open) return null

  async function saveProject() {
    if (!selectedId || !customerName.trim() || !projectAddress.trim()) return

    setSaving(true)
    const res = await fetch(`/api/projects/${selectedId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_name: customerName.trim(),
        project_address: projectAddress.trim(),
      }),
    })
    const payload = await res.json().catch(() => ({}))
    setSaving(false)

    if (!res.ok) {
      alert(payload.error || 'Could not update project.')
      return
    }

    if (payload.project) {
      onUpdated(payload.project as Project)
    }
  }

  async function deleteProject() {
    if (!selected) return
    const ok = window.confirm(
      `Delete "${selected.customer_name}" and all jobs and uploaded files? This cannot be undone.`
    )
    if (!ok) return

    setDeleting(true)
    const res = await fetch(`/api/projects/${selected.id}`, { method: 'DELETE' })
    const payload = await res.json().catch(() => ({}))
    setDeleting(false)

    if (!res.ok) {
      alert(payload.error || 'Could not delete project.')
      return
    }

    onDeleted(selected.id)
    if (projects.length <= 1) {
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-projects-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md border border-border rounded-xl bg-surface-elevated shadow-2xl p-4 space-y-4 max-h-[90dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2">
          <h2 id="edit-projects-title" className="font-bold text-lg">
            Edit projects
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-muted hover:text-foreground min-h-[40px] px-2"
          >
            Close
          </button>
        </div>

        {projects.length === 0 ? (
          <p className="text-sm text-muted">No projects to edit yet.</p>
        ) : (
          <>
            <label className="block space-y-1">
              <span className="text-sm font-medium">Project</span>
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="border border-border rounded-xl p-3 w-full bg-surface"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.customer_name} — {p.project_address}
                  </option>
                ))}
              </select>
            </label>

            <input
              className="border border-border rounded-xl p-3 w-full bg-surface"
              placeholder="Customer name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
            />

            <input
              className="border border-border rounded-xl p-3 w-full bg-surface"
              placeholder="Project address"
              value={projectAddress}
              onChange={(e) => setProjectAddress(e.target.value)}
            />

            <button
              type="button"
              onClick={saveProject}
              disabled={
                saving ||
                deleting ||
                !customerName.trim() ||
                !projectAddress.trim()
              }
              className="w-full btn-primary text-[#052e16] py-3 rounded-xl font-medium disabled:opacity-50 min-h-[48px]"
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>

            <button
              type="button"
              onClick={deleteProject}
              disabled={saving || deleting}
              className="w-full border border-red-900/40 py-3 rounded-xl text-red-400 text-sm font-semibold disabled:opacity-50 min-h-[48px]"
            >
              {deleting ? 'Deleting…' : 'Delete project'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

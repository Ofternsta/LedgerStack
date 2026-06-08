'use client'

import { useEffect, useState } from 'react'

type Project = {
  id: string
  customer_name: string
  project_address: string
}

type Props = {
  project: Project | null
  open: boolean
  onClose: () => void
  onUpdated: (project: Project) => void
  onDeleted: (projectId: string) => void
}

export function ProjectsEditPanel({
  project,
  open,
  onClose,
  onUpdated,
  onDeleted,
}: Props) {
  const [customerName, setCustomerName] = useState('')
  const [projectAddress, setProjectAddress] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!project) {
      setCustomerName('')
      setProjectAddress('')
      return
    }
    setCustomerName(project.customer_name)
    setProjectAddress(project.project_address)
  }, [project?.id, project?.customer_name, project?.project_address])

  if (!open || !project) return null

  async function saveProject() {
    if (!customerName.trim() || !projectAddress.trim()) return

    setSaving(true)
    const res = await fetch(`/api/projects/${project.id}`, {
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
    onClose()
  }

  async function deleteProject() {
    const ok = window.confirm(
      `Delete "${project.customer_name}" and all jobs and uploaded files? This cannot be undone.`
    )
    if (!ok) return

    setDeleting(true)
    const res = await fetch(`/api/projects/${project.id}`, { method: 'DELETE' })
    const payload = await res.json().catch(() => ({}))
    setDeleting(false)

    if (!res.ok) {
      alert(payload.error || 'Could not delete project.')
      return
    }

    onDeleted(project.id)
    onClose()
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
            Edit project
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-muted hover:text-foreground min-h-[40px] px-2"
          >
            Close
          </button>
        </div>

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
            saving || deleting || !customerName.trim() || !projectAddress.trim()
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
      </div>
    </div>
  )
}

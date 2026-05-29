'use client'

import { useState } from 'react'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { LegalNotice } from '@/components/legal-notice'
import {
  CLAIM_STATUSES,
  type ClaimStatus,
  claimStatusIndex,
  normalizeClaimStatus,
} from '@/lib/claim-status'
import {
  COMPLETED_PROJECT_RETENTION_DAYS,
  INACTIVE_PROJECT_RETENTION_MONTHS,
} from '@/lib/data-retention'
import {
  defaultClaimStatusLabels,
  displayClaimStatus,
  type ClaimStatusLabels,
} from '@/lib/org-status-labels'

type Props = {
  claimId: string
  projectId: string
  status: string
  canEdit: boolean
  statusLabels?: ClaimStatusLabels | null
  showReadOnlyHint?: boolean
  onStatusChange: (status: ClaimStatus) => void
  onMarkedCompleted?: () => void
}

export function ClaimStatusWorkflow({
  claimId,
  projectId,
  status,
  canEdit,
  statusLabels,
  showReadOnlyHint = true,
  onStatusChange,
  onMarkedCompleted,
}: Props) {
  const labels = statusLabels ?? defaultClaimStatusLabels()
  const current = normalizeClaimStatus(status)
  const currentIndex = claimStatusIndex(current)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingStatus, setPendingStatus] = useState<ClaimStatus | null>(null)

  async function applyStatus(next: ClaimStatus) {
    setSaving(true)
    setError(null)

    const res = await fetch('/api/claims/status', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        claim_id: claimId,
        project_id: projectId,
        status: next,
      }),
    })
    const payload = await res.json().catch(() => ({}))

    if (!res.ok) {
      setError(payload.error || 'Could not update status')
      setSaving(false)
      return
    }

    onStatusChange(next)
    if (next === 'Completed') {
      onMarkedCompleted?.()
    }
    setSaving(false)
  }

  function requestStatus(next: ClaimStatus) {
    if (!canEdit || next === current || saving) return

    if (next === 'Completed') {
      setPendingStatus(next)
      return
    }

    void applyStatus(next)
  }

  const currentLabel = displayClaimStatus(current, labels)

  return (
    <section className="border border-border rounded-xl p-4 bg-surface-elevated">
      <ConfirmDialog
        open={pendingStatus === 'Completed'}
        title="Mark report as completed?"
        description={`This project and all of its files and messages will be permanently deleted in ${COMPLETED_PROJECT_RETENTION_DAYS} days unless you change the status before then.\n\nSave an archive or backup first if you need to keep records.`}
        confirmLabel="Mark completed"
        destructive
        busy={saving}
        onCancel={() => setPendingStatus(null)}
        onConfirm={() => {
          const next = pendingStatus
          setPendingStatus(null)
          if (next) void applyStatus(next)
        }}
      />

      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h2 className="font-bold text-foreground">Report status</h2>
        <span className="text-sm font-medium text-muted">{currentLabel}</span>
      </div>

      <ol className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {CLAIM_STATUSES.map((stage, index) => {
          const isPast = index < currentIndex
          const isCurrent = index === currentIndex
          const label = displayClaimStatus(stage, labels)

          return (
            <li key={stage}>
              <button
                type="button"
                disabled={!canEdit || saving || isCurrent}
                onClick={() => requestStatus(stage)}
                className={`w-full text-left rounded-lg px-2 py-2 text-xs sm:text-sm border transition min-h-[52px] ${
                  isCurrent
                    ? 'btn-primary text-[#052e16] border-black font-semibold'
                    : isPast
                      ? 'bg-green-50 text-green-900 border-green-200'
                      : 'bg-surface text-muted border-border'
                } ${canEdit && !isCurrent ? 'hover:border-gray-400 cursor-pointer' : ''} ${
                  !canEdit || saving ? 'opacity-80 cursor-default' : ''
                }`}
              >
                <span className="block text-[10px] uppercase tracking-wide opacity-70 mb-0.5">
                  {index + 1}
                </span>
                {label}
              </button>
            </li>
          )
        })}
      </ol>

      {canEdit && (
        <p className="text-xs text-muted-dim mt-3">
          Tap a stage to update the report workflow. Completed projects are removed
          after {COMPLETED_PROJECT_RETENTION_DAYS} days; inactive projects after{' '}
          {INACTIVE_PROJECT_RETENTION_MONTHS} months.
        </p>
      )}

      {!canEdit && showReadOnlyHint && (
        <p className="text-xs text-muted-dim mt-3">
          View only — status updates are for your contractor team.
        </p>
      )}

      {saving && (
        <p className="text-sm text-muted mt-2">Updating status…</p>
      )}
      {error && <p className="text-sm text-red-400 mt-2">{error}</p>}

      <LegalNotice id="no-guarantee" className="mt-3" />
    </section>
  )
}

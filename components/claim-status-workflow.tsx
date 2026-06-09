'use client'

import { useState } from 'react'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { LegalNotice } from '@/components/legal-notice'
import {
  COMPLETED_PROJECT_RETENTION_DAYS,
  INACTIVE_PROJECT_RETENTION_MONTHS,
} from '@/lib/data-retention'
import {
  COMPLETED_STATUS_KEY,
  isCompletedStatus,
  normalizeStatusKey,
  statusIndex,
  statusLabel,
  type StatusStage,
} from '@/lib/project-status-workflow'

type Props = {
  claimId: string
  projectId: string
  status: string
  workflow: StatusStage[]
  canEdit: boolean
  showReadOnlyHint?: boolean
  embedded?: boolean
  onStatusChange: (statusKey: string) => void
  onMarkedCompleted?: () => void
}

export function ClaimStatusWorkflow({
  claimId,
  projectId,
  status,
  workflow,
  canEdit,
  showReadOnlyHint = true,
  embedded = false,
  onStatusChange,
  onMarkedCompleted,
}: Props) {
  const currentKey = normalizeStatusKey(status, workflow)
  const currentIndex = statusIndex(currentKey, workflow)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingKey, setPendingKey] = useState<string | null>(null)

  async function applyStatus(nextKey: string) {
    setSaving(true)
    setError(null)

    const res = await fetch('/api/claims/status', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        claim_id: claimId,
        project_id: projectId,
        status: nextKey,
      }),
    })
    const payload = await res.json().catch(() => ({}))

    if (!res.ok) {
      setError(payload.error || 'Could not update status')
      setSaving(false)
      return
    }

    onStatusChange(nextKey)
    if (isCompletedStatus(nextKey, workflow)) {
      onMarkedCompleted?.()
    }
    setSaving(false)
  }

  function requestStatus(nextKey: string) {
    if (!canEdit || nextKey === currentKey || saving) return

    if (nextKey === COMPLETED_STATUS_KEY) {
      setPendingKey(nextKey)
      return
    }

    void applyStatus(nextKey)
  }

  const currentLabel = statusLabel(currentKey, workflow)
  const progressPct =
    workflow.length > 1
      ? Math.round((currentIndex / (workflow.length - 1)) * 100)
      : currentIndex > 0
        ? 100
        : 0

  const Wrapper = embedded ? 'div' : 'section'
  const wrapperClass = embedded
    ? 'space-y-3'
    : 'border border-border rounded-xl p-4 bg-surface-elevated'

  return (
    <Wrapper className={wrapperClass}>
      <ConfirmDialog
        open={pendingKey === COMPLETED_STATUS_KEY}
        title="Mark job as completed?"
        description={`This project and all of its files and messages will be permanently deleted in ${COMPLETED_PROJECT_RETENTION_DAYS} days unless you change the status before then.\n\nSave an archive or backup first if you need to keep records.`}
        confirmLabel="Mark completed"
        destructive
        busy={saving}
        onCancel={() => setPendingKey(null)}
        onConfirm={() => {
          const next = pendingKey
          setPendingKey(null)
          if (next) void applyStatus(next)
        }}
      />

      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h2
          className={
            embedded
              ? 'text-sm font-bold uppercase tracking-wide text-muted-dim'
              : 'font-bold text-foreground'
          }
        >
          Job status
        </h2>
        <span className="text-sm font-medium text-muted">{currentLabel}</span>
      </div>

      <ol className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {workflow.map((stage, index) => {
          const isPast = index < currentIndex
          const isCurrent = index === currentIndex
          const label = stage.label

          return (
            <li key={stage.key} className="sm:col-span-1">
              <button
                type="button"
                disabled={!canEdit || saving || isCurrent}
                onClick={() => requestStatus(stage.key)}
                className={`w-full text-left rounded-lg px-2 py-2 text-xs sm:text-sm border transition-all duration-300 min-h-[52px] ${
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
          Tap a stage to update the job workflow. Completed projects are removed
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
    </Wrapper>
  )
}

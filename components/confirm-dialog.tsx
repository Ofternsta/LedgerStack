'use client'

type ConfirmDialogProps = {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div className="card max-w-md w-full p-5 shadow-xl border border-border">
        <h2
          id="confirm-dialog-title"
          className="text-lg font-bold text-foreground mb-2"
        >
          {title}
        </h2>
        <p className="text-sm text-muted leading-relaxed whitespace-pre-line">
          {description}
        </p>
        <div className="flex flex-wrap gap-2 mt-5 justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="btn-secondary px-4 py-2 text-sm min-h-[44px]"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`px-4 py-2 text-sm min-h-[44px] rounded-lg font-semibold ${
              destructive
                ? 'bg-red-600 text-white hover:bg-red-500'
                : 'btn-primary'
            }`}
          >
            {busy ? 'Please wait…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

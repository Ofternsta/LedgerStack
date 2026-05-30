'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { LegalNotice } from '@/components/legal-notice'
import { isNativeApp, takeNativePhoto } from '@/lib/native-photo'

type EvidenceUploadProps = {
  uploading: boolean
  uploadMessage: string | null
  uploadProgress?: number | null
  uploadProgressLabel?: string
  onUpload: (file: File) => void
  onUploadMany?: (files: File[]) => void
}

export function EvidenceUpload({
  uploading,
  uploadMessage,
  uploadProgress = null,
  uploadProgressLabel,
  onUpload,
  onUploadMany,
}: EvidenceUploadProps) {
  const [native, setNative] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    isNativeApp().then(setNative)
  }, [])

  function handleFiles(fileList: FileList | null) {
    if (!fileList?.length) return
    const files = Array.from(fileList)
    if (files.length > 1 && onUploadMany) {
      onUploadMany(files)
    } else {
      for (const file of files) onUpload(file)
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    handleFiles(e.target.files)
    e.target.value = ''
  }

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      if (uploading) return
      handleFiles(e.dataTransfer.files)
    },
    [uploading, onUpload, onUploadMany]
  )

  async function handleNativeCamera() {
    try {
      const file = await takeNativePhoto()
      if (file) onUpload(file)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Could not open camera'
      alert(message)
    }
  }

  return (
    <div className="border p-4 rounded-xl bg-surface">
      <h2 className="font-bold mb-3 text-lg">Upload documents</h2>

      <div
        onDragOver={(e) => {
          e.preventDefault()
          if (!uploading) setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`rounded-xl border-2 border-dashed p-6 mb-4 transition-colors ${
          dragOver
            ? 'border-blue-500 bg-blue-50'
            : 'border-border bg-surface-elevated'
        }`}
      >
        <p className="text-center text-sm text-muted mb-3">
          Drag and drop files here, or use the buttons below
        </p>
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="w-full border-2 border-white/90 text-white py-3 rounded-xl font-medium min-h-[48px] hover:bg-white/10 disabled:opacity-50"
        >
          {uploading ? 'Processing…' : 'Browse files (multi-select)'}
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="sr-only"
          disabled={uploading}
          onChange={handleChange}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {native ? (
          <button
            type="button"
            disabled={uploading}
            onClick={handleNativeCamera}
            className="flex items-center justify-center gap-2 btn-primary text-[#052e16] py-4 px-4 rounded-xl font-medium active:scale-[0.98] transition-transform min-h-[52px] disabled:opacity-50"
          >
            <span aria-hidden>📷</span>
            {uploading ? 'Processing…' : 'Take Photo'}
          </button>
        ) : (
          <label className="flex items-center justify-center gap-2 btn-primary text-[#052e16] py-4 px-4 rounded-xl font-medium cursor-pointer active:scale-[0.98] transition-transform min-h-[52px]">
            <span aria-hidden>📷</span>
            {uploading ? 'Processing…' : 'Take Photo'}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              disabled={uploading}
              onChange={handleChange}
            />
          </label>
        )}

        <label className="flex items-center justify-center gap-2 border-2 border-white/90 text-white py-4 px-4 rounded-xl font-medium cursor-pointer hover:bg-white/10 active:scale-[0.98] transition-transform min-h-[52px]">
          <span aria-hidden>📎</span>
          {uploading ? 'Processing…' : 'Choose File'}
          <input
            type="file"
            multiple
            accept="image/*,application/pdf,.heic,.heif,.docx"
            className="sr-only"
            disabled={uploading}
            onChange={handleChange}
          />
        </label>
      </div>

      <p className="text-sm text-muted mt-3 leading-relaxed">
        Photos, PDFs, and Word docs — AI categorizes and summarizes after upload.
      </p>

      {uploading && uploadProgress != null && (
        <div className="mt-4" role="progressbar" aria-valuenow={uploadProgress} aria-valuemin={0} aria-valuemax={100}>
          <div className="flex justify-between text-xs text-muted mb-1.5">
            <span>{uploadProgressLabel ?? 'Processing…'}</span>
            <span className="tabular-nums font-medium text-brand-bright">{uploadProgress}%</span>
          </div>
          <div className="upload-progress-track">
            <div
              className="upload-progress-fill"
              style={{ width: `${Math.min(100, Math.max(0, uploadProgress))}%` }}
            />
          </div>
        </div>
      )}

      {uploading && uploadProgress == null && (
        <p className="mt-3 text-sm font-medium text-muted">
          Uploading, extracting text, categorizing, and summarizing…
        </p>
      )}

      {uploadMessage && (
        <p
          className={`mt-3 text-sm leading-relaxed ${
            uploadMessage.startsWith('Uploaded')
              ? 'text-green-800'
              : 'text-red-400'
          }`}
        >
          {uploadMessage}
        </p>
      )}

      <LegalNotice id="file-responsibility" className="mt-3" />
    </div>
  )
}

'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  downloadProjectArchive,
  getSavedArchiveFolder,
  pickArchiveFolder,
  saveProjectArchiveToFolder,
  supportsArchiveFolderPicker,
} from '@/lib/save-archive-client'

type Props = {
  projectId: string
  projectName: string
  jobCompleted: boolean
  allJobsCompleted: boolean
  canArchive: boolean
  /** When set, show a one-time prompt to save after marking completed */
  promptSave?: boolean
  onPromptDismiss?: () => void
}

export function ProjectArchivePanel({
  projectId,
  projectName,
  jobCompleted,
  allJobsCompleted,
  canArchive,
  promptSave,
  onPromptDismiss,
}: Props) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [folderName, setFolderName] = useState<string | null>(null)
  const folderSupported = supportsArchiveFolderPicker()

  const refreshFolderLabel = useCallback(async () => {
    if (!folderSupported) return
    const handle = await getSavedArchiveFolder()
    setFolderName(handle?.name || null)
  }, [folderSupported])

  useEffect(() => {
    void refreshFolderLabel()
  }, [refreshFolderLabel])

  if (!canArchive) return null

  const showPanel = jobCompleted || allJobsCompleted || promptSave

  async function handleDownload() {
    setBusy(true)
    setError(null)
    setSuccess(null)
    try {
      await downloadProjectArchive(projectId)
      setSuccess('Archive downloaded — choose where to save it in your browser dialog.')
      onPromptDismiss?.()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Download failed')
    } finally {
      setBusy(false)
    }
  }

  async function handleChooseFolder() {
    setBusy(true)
    setError(null)
    try {
      const handle = await pickArchiveFolder()
      setFolderName(handle.name)
      setSuccess(`Save folder set to “${handle.name}”. Use “Save to folder” to extract files there.`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not choose folder')
    } finally {
      setBusy(false)
    }
  }

  async function handleSaveToFolder() {
    setBusy(true)
    setError(null)
    setSuccess(null)
    try {
      const name = await saveProjectArchiveToFolder(projectId)
      setSuccess(
        `Saved project files, messages, and job intelligence to folder “${name}”.`
      )
      await refreshFolderLabel()
      onPromptDismiss?.()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not save to folder')
    } finally {
      setBusy(false)
    }
  }

  if (!showPanel && !promptSave) {
    return (
      <section className="border border-dashed border-border rounded-xl p-4 bg-surface">
        <h2 className="font-bold text-foreground">Project archive</h2>
        <p className="text-sm text-muted mt-2 leading-relaxed">
          When a job reaches <strong>Completed</strong>, you can save all documents,
          messages, and job intelligence to your computer.
        </p>
      </section>
    )
  }

  return (
    <section
      className={`border rounded-xl p-4 space-y-3 ${
        promptSave || jobCompleted
          ? 'border-brand-dim/60 bg-[var(--info-surface)]'
          : 'border-border bg-surface-elevated'
      }`}
    >
      <div>
        <h2 className="font-bold text-lg text-foreground">Save project archive</h2>
        <p className="text-sm text-muted mt-1 leading-relaxed">
          {promptSave ? (
            <>
              <strong>{projectName}</strong> is marked completed. Save documents, project
              messages, internal notes, schedule, and job intelligence (timeline + summaries)
              to your computer.
            </>
          ) : allJobsCompleted ? (
            <>All jobs on this project are completed. Download or save a full archive.</>
          ) : (
            <>
              This job is completed. Archive includes all jobs on{' '}
              <strong>{projectName}</strong>.
            </>
          )}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={handleDownload}
          className="text-sm btn-primary text-[#052e16] px-4 py-2.5 rounded-lg min-h-[40px] disabled:opacity-50"
        >
          {busy ? 'Preparing…' : 'Download ZIP'}
        </button>

        {folderSupported && (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={handleSaveToFolder}
              className="text-sm border border-border px-4 py-2.5 rounded-lg min-h-[40px] disabled:opacity-50"
            >
              Save to folder…
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={handleChooseFolder}
              className="text-sm border border-border px-3 py-2.5 rounded-lg min-h-[40px] disabled:opacity-50"
            >
              Choose save folder
            </button>
          </>
        )}
      </div>

      {folderSupported && (
        <p className="text-xs text-muted-dim">
          {folderName
            ? `Default folder: ${folderName}. “Save to folder” extracts the archive there (Chrome/Edge desktop).`
            : 'On supported browsers, choose a folder once — files are extracted there instead of a single ZIP.'}
        </p>
      )}

      {!folderSupported && (
        <p className="text-xs text-muted-dim">
          Use Download ZIP and pick a location in your browser’s save dialog. Folder pickers
          work on Chrome or Edge desktop.
        </p>
      )}

      {success && (
        <p className="text-sm text-green-800 bg-green-50 border border-green-100 rounded-lg p-2">
          {success}
        </p>
      )}
      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg p-2">
          {error}
        </p>
      )}

      {promptSave && (
        <button
          type="button"
          className="text-xs text-muted underline"
          onClick={onPromptDismiss}
        >
          Dismiss for now
        </button>
      )}
    </section>
  )
}

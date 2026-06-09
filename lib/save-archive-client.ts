import JSZip from 'jszip'
import { saveBlobAsDownload } from '@/lib/download-blob-client'
import {
  clearArchiveFolderHandle,
  ensureFolderPermission,
  getArchiveFolderHandle,
  saveArchiveFolderHandle,
} from '@/lib/archive-folder-handle'

export function supportsArchiveFolderPicker(): boolean {
  return (
    typeof window !== 'undefined' &&
    'showDirectoryPicker' in window &&
    typeof indexedDB !== 'undefined'
  )
}

export async function fetchProjectArchiveBlob(
  projectId: string
): Promise<{ blob: Blob; filename: string }> {
  const res = await fetch(`/api/archive-project?project_id=${encodeURIComponent(projectId)}`)
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}))
    throw new Error(
      (payload as { error?: string }).error || 'Could not download project archive'
    )
  }

  const blob = await res.blob()
  const disposition = res.headers.get('Content-Disposition') || ''
  const match = disposition.match(/filename="([^"]+)"/)
  const filename = match?.[1] || `ledgerstack-project-${projectId}.zip`

  return { blob, filename }
}

export async function downloadArchiveBlob(blob: Blob, filename: string) {
  const result = await saveBlobAsDownload(blob, filename)
  if (!result.ok) {
    throw new Error(result.error)
  }
}

async function writeZipEntryToFolder(
  zip: JSZip,
  folder: FileSystemDirectoryHandle,
  zipPath: string
) {
  const entry = zip.file(zipPath)
  if (!entry) return

  const parts = zipPath.split('/').filter(Boolean)
  const fileName = parts.pop()
  if (!fileName) return

  let current = folder
  for (const segment of parts) {
    current = await current.getDirectoryHandle(segment, { create: true })
  }

  const content = await entry.async('blob')
  const fileHandle = await current.getFileHandle(fileName, { create: true })
  const writable = await fileHandle.createWritable()
  await writable.write(content)
  await writable.close()
}

export async function pickArchiveFolder(): Promise<FileSystemDirectoryHandle> {
  if (!supportsArchiveFolderPicker()) {
    throw new Error('Choosing a save folder is not supported in this browser.')
  }
  const picker = window as Window & {
    showDirectoryPicker?: (opts?: {
      mode?: 'read' | 'readwrite'
      id?: string
    }) => Promise<FileSystemDirectoryHandle>
  }
  const handle = await picker.showDirectoryPicker!({
    mode: 'readwrite',
    id: 'ledgerstack-project-archive',
  })
  await saveArchiveFolderHandle(handle)
  return handle
}

export async function getSavedArchiveFolder(): Promise<FileSystemDirectoryHandle | null> {
  if (!supportsArchiveFolderPicker()) return null
  const handle = await getArchiveFolderHandle()
  if (!handle) return null
  const ok = await ensureFolderPermission(handle)
  return ok ? handle : null
}

export async function saveArchiveBlobToFolder(
  blob: Blob,
  folder: FileSystemDirectoryHandle,
  options?: { extractZip?: boolean }
) {
  const extract = options?.extractZip !== false

  if (!extract) {
    const zipName = 'project-archive.zip'
    const fileHandle = await folder.getFileHandle(zipName, { create: true })
    const writable = await fileHandle.createWritable()
    await writable.write(blob)
    await writable.close()
    return
  }

  const zip = await JSZip.loadAsync(blob)
  const paths = Object.keys(zip.files).filter((p) => !zip.files[p].dir)

  for (const path of paths) {
    await writeZipEntryToFolder(zip, folder, path)
  }
}

export async function saveProjectArchiveToFolder(
  projectId: string,
  folder?: FileSystemDirectoryHandle
) {
  const target =
    folder || (await getSavedArchiveFolder()) || (await pickArchiveFolder())
  const ok = await ensureFolderPermission(target)
  if (!ok) {
    await clearArchiveFolderHandle()
    throw new Error('Permission to save to that folder was denied.')
  }

  const { blob } = await fetchProjectArchiveBlob(projectId)
  const projectFolder = await target.getDirectoryHandle(
    `ledgerstack-project-${projectId.slice(0, 8)}`,
    { create: true }
  )
  await saveArchiveBlobToFolder(blob, projectFolder, { extractZip: true })
  return target.name
}

export async function downloadProjectArchive(projectId: string) {
  const { blob, filename } = await fetchProjectArchiveBlob(projectId)
  await downloadArchiveBlob(blob, filename)
}

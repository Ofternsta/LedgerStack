import type { EvidenceRecord } from '@/lib/evidence-storage'
import { prepareEvidenceFileForUpload } from '@/lib/compress-evidence-client'

export type UploadProgressCallback = (percent: number, label: string) => void

async function parseUploadError(res: Response): Promise<string> {
  if (res.status === 413) {
    return 'Photo is too large for upload. We now resize photos automatically — refresh the page and try again.'
  }

  const body = await res.text()
  if (!body) {
    return `Upload failed (${res.status})`
  }

  if (/entity too large/i.test(body)) {
    return 'Photo is too large for upload. Refresh the page and try Take Photo again.'
  }

  try {
    const payload = JSON.parse(body) as { error?: string }
    if (payload.error) return payload.error
  } catch {
    /* not JSON */
  }
  return body.length > 280 ? `${body.slice(0, 280)}…` : body
}

function uploadWithProgress(
  formData: FormData,
  onProgress?: UploadProgressCallback
): Promise<Response> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', '/api/upload')

    xhr.upload.addEventListener('progress', (e) => {
      if (!onProgress) return
      if (e.lengthComputable && e.total > 0) {
        const pct = 20 + Math.round((e.loaded / e.total) * 65)
        onProgress(Math.min(85, pct), 'Uploading…')
      } else {
        onProgress(40, 'Uploading…')
      }
    })

    xhr.addEventListener('load', () => {
      resolve(
        new Response(xhr.responseText, {
          status: xhr.status,
          statusText: xhr.statusText,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    })

    xhr.addEventListener('error', () => reject(new Error('Network error during upload')))
    xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')))

    xhr.send(formData)
  })
}

/** Upload file to storage, then run server AI/OCR via /api/upload. */
export async function uploadEvidenceWithAi(
  projectId: string,
  claimId: string,
  file: File,
  onProgress?: UploadProgressCallback
): Promise<EvidenceRecord> {
  onProgress?.(5, 'Preparing file…')
  const prepared = await prepareEvidenceFileForUpload(file)
  onProgress?.(15, 'Uploading…')

  const formData = new FormData()
  formData.append('file', prepared)
  formData.append('project_id', projectId)
  formData.append('claim_id', claimId)

  const res = await uploadWithProgress(formData, onProgress)

  if (res.status === 401) {
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }

  if (!res.ok) {
    throw new Error(await parseUploadError(res))
  }

  onProgress?.(92, 'Analyzing with AI…')
  const payload = (await res.json()) as { evidence: EvidenceRecord }
  onProgress?.(100, 'Done')
  return payload.evidence
}

/** Re-run text extraction and AI summary on a file already in storage. */
export async function rescanEvidenceWithAi(
  projectId: string,
  claimId: string,
  filePath: string,
  fileName: string,
  fileType: string,
  onProgress?: UploadProgressCallback
): Promise<EvidenceRecord> {
  onProgress?.(20, 'Re-scanning…')

  const res = await fetch('/api/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      project_id: projectId,
      claim_id: claimId,
      file_path: filePath,
      file_name: fileName,
      file_type: fileType,
    }),
  })

  if (res.status === 401) {
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }

  if (!res.ok) {
    throw new Error(await parseUploadError(res))
  }

  onProgress?.(100, 'Done')
  const payload = (await res.json()) as { evidence: EvidenceRecord }
  return payload.evidence
}

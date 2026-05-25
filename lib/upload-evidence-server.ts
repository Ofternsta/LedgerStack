import type { EvidenceRecord } from '@/lib/evidence-storage'

async function parseUploadError(res: Response): Promise<string> {
  const body = await res.text()
  if (!body) {
    return `Upload failed (${res.status})`
  }
  try {
    const payload = JSON.parse(body) as { error?: string }
    if (payload.error) return payload.error
  } catch {
    /* not JSON */
  }
  return body.length > 280 ? `${body.slice(0, 280)}…` : body
}

/** Upload file to storage, then run server AI/OCR via /api/upload. */
export async function uploadEvidenceWithAi(
  projectId: string,
  claimId: string,
  file: File
): Promise<EvidenceRecord> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('project_id', projectId)
  formData.append('claim_id', claimId)

  const res = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  })

  if (res.status === 401) {
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }

  if (!res.ok) {
    throw new Error(await parseUploadError(res))
  }

  const payload = (await res.json()) as { evidence: EvidenceRecord }
  return payload.evidence
}

/** Re-run text extraction and AI summary on a file already in storage. */
export async function rescanEvidenceWithAi(
  projectId: string,
  claimId: string,
  filePath: string,
  fileName: string,
  fileType: string
): Promise<EvidenceRecord> {
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

  const payload = (await res.json()) as { evidence: EvidenceRecord }
  return payload.evidence
}

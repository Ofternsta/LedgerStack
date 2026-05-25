import type { EvidenceRecord } from '@/lib/evidence-storage'

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

  const payload = await res.json().catch(() => ({}))

  if (res.status === 401) {
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }

  if (!res.ok) {
    throw new Error(payload.error || 'Upload failed')
  }

  return payload.evidence as EvidenceRecord
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

  const payload = await res.json().catch(() => ({}))

  if (res.status === 401) {
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }

  if (!res.ok) {
    throw new Error(payload.error || 'Re-scan failed')
  }

  return payload.evidence as EvidenceRecord
}

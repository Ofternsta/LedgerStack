import { guessEvidenceTypeFromFile } from '@/lib/evidence-types'
import { describeFile } from '@/lib/file-meta'
import { supabase } from '@/lib/supabase'

const BUCKET = 'project-files'

export type ClientEvidenceRecord = {
  id: string
  claim_id: string
  file_name: string
  file_path: string
  file_type: string
  evidence_type: string
  summary: string
  created_at: string
}

function buildSummary(file: File, evidenceType: string) {
  const label = evidenceType || 'Other'
  if (file.type.startsWith('image/')) {
    return `${label}: ${describeFile(file)} — photo stored for claim documentation.`
  }
  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
    return `${label}: ${describeFile(file)} — PDF stored for claim documentation.`
  }
  if (file.type.startsWith('video/')) {
    return `${label}: ${describeFile(file)} — video stored for claim documentation.`
  }
  return `${label}: ${describeFile(file)} — file stored successfully.`
}

/** Upload + categorize entirely from the browser (works on Vercel; no server PDF libs). */
export async function uploadEvidenceClient(
  projectId: string,
  claimId: string,
  file: File
): Promise<ClientEvidenceRecord> {
  const filePath = `${projectId}/${claimId}/${Date.now()}-${file.name}`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, file)

  if (uploadError) {
    throw new Error(uploadError.message)
  }

  const evidenceType = guessEvidenceTypeFromFile(file)
  const record: ClientEvidenceRecord = {
    id: crypto.randomUUID(),
    claim_id: claimId,
    file_name: file.name,
    file_path: filePath,
    file_type: file.type,
    evidence_type: evidenceType,
    summary: buildSummary(file, evidenceType),
    created_at: new Date().toISOString(),
  }

  const { error: metaError } = await supabase.storage
    .from(BUCKET)
    .upload(`${filePath}.meta.json`, JSON.stringify(record, null, 2), {
      contentType: 'application/json',
      upsert: true,
    })

  if (metaError) {
    await supabase.storage.from(BUCKET).remove([filePath])
    throw new Error(metaError.message)
  }

  return record
}

import { SIGNED_DOCUMENTS_CATEGORY_LABEL } from '@/lib/project-file-categories'

export function isSignedEvidenceFile(input: {
  file_name: string
  file_path: string
  evidence_type?: string
  summary?: string
}): boolean {
  const name = input.file_name.toLowerCase()
  const path = input.file_path.toLowerCase()

  if (name.startsWith('signed-') || path.includes('/signed-')) {
    return true
  }

  if (
    input.evidence_type?.trim().toLowerCase() ===
    SIGNED_DOCUMENTS_CATEGORY_LABEL.toLowerCase()
  ) {
    return true
  }

  if (input.summary?.trim().toLowerCase().startsWith('signed copy of')) {
    return true
  }

  return false
}

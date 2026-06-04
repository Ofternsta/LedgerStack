import type { SupabaseClient } from '@supabase/supabase-js'
import { listAllProjectEvidence } from '@/lib/evidence-storage'
import {
  SIGNED_DOCUMENTS_CATEGORY_LABEL,
} from '@/lib/project-file-categories'
import { isSignedEvidenceFile } from '@/lib/signed-evidence-files'
import { updateEvidenceMeta } from '@/lib/update-evidence-meta'

/** Fixes signed PDF metadata that was filed under the wrong category. */
export async function repairSignedEvidenceOnProject(
  supabase: SupabaseClient,
  projectId: string
): Promise<number> {
  const files = await listAllProjectEvidence(supabase, projectId)
  let repaired = 0

  for (const file of files) {
    if (!isSignedEvidenceFile(file)) continue

    const current = file.evidence_type?.trim().toLowerCase()
    const target = SIGNED_DOCUMENTS_CATEGORY_LABEL.toLowerCase()
    if (current === target) continue

    await updateEvidenceMeta(supabase, file.file_path, {
      evidence_type: SIGNED_DOCUMENTS_CATEGORY_LABEL,
    })
    repaired += 1
  }

  return repaired
}

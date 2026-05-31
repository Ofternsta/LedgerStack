import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import { listEvidence } from '@/lib/evidence-storage'
import { touchProjectActivity } from '@/lib/touch-project-activity'

const PROJECT_FILES_BUCKET = 'project-files'

async function listStoragePaths(
  supabase: SupabaseClient,
  prefix: string
): Promise<string[]> {
  const paths: string[] = []
  const { data, error } = await supabase.storage
    .from(PROJECT_FILES_BUCKET)
    .list(prefix, { limit: 1000 })

  if (error || !data) return paths

  for (const item of data) {
    if (!item.name) continue
    const path = prefix ? `${prefix}/${item.name}` : item.name
    if (item.id === null) {
      paths.push(...(await listStoragePaths(supabase, path)))
    } else {
      paths.push(path)
    }
  }

  return paths
}

/** Service-role delete: job files, optional DB evidence rows, then claim (timeline cascades). */
export async function deleteJobServer(
  supabase: SupabaseClient,
  projectId: string,
  claimId: string
): Promise<{ error: string | null }> {
  const { data: claim, error: claimError } = await supabase
    .from('claims')
    .select('id, project_id')
    .eq('id', claimId)
    .eq('project_id', projectId)
    .maybeSingle()

  if (claimError) {
    return { error: claimError.message }
  }

  if (!claim) {
    return { error: 'Job not found on this project.' }
  }

  const { count, error: countError } = await supabase
    .from('claims')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', projectId)

  if (countError) {
    return { error: countError.message }
  }

  if ((count ?? 0) <= 1) {
    return {
      error:
        'Cannot delete the only job on a project. Delete the entire project from the projects list instead.',
    }
  }

  const evidence = await listEvidence(supabase, projectId, claimId)
  for (const file of evidence) {
    try {
      const paths = [file.file_path, `${file.file_path}.meta.json`]
      await supabase.storage.from(PROJECT_FILES_BUCKET).remove(paths)
    } catch (err) {
      console.warn('deleteJobServer evidence:', file.file_path, err)
    }
  }

  const prefix = `${projectId}/${claimId}`
  const storagePaths = await listStoragePaths(supabase, prefix)
  if (storagePaths.length) {
    const { error: storageError } = await supabase.storage
      .from(PROJECT_FILES_BUCKET)
      .remove(storagePaths)
    if (storageError) {
      console.warn('deleteJobServer storage:', claimId, storageError.message)
    }
  }

  const { error: evidenceTableError } = await supabase
    .from('claim_evidence')
    .delete()
    .eq('claim_id', claimId)

  if (evidenceTableError && !evidenceTableError.message.includes('does not exist')) {
    console.warn('deleteJobServer claim_evidence:', evidenceTableError.message)
  }

  const { data: deleted, error: deleteError } = await supabase
    .from('claims')
    .delete()
    .eq('id', claimId)
    .eq('project_id', projectId)
    .select('id')

  if (deleteError) {
    return { error: deleteError.message }
  }

  if (!deleted?.length) {
    return { error: 'Job not found or delete blocked' }
  }

  await touchProjectActivity(supabase, projectId)

  return { error: null }
}

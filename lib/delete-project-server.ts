import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

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

/** Service-role delete: storage cleanup then project row (cascades related tables). */
export async function deleteProjectServer(
  supabase: SupabaseClient,
  projectId: string
): Promise<{ error: string | null }> {
  const files = await listStoragePaths(supabase, projectId)
  if (files.length) {
    const { error: storageError } = await supabase.storage
      .from(PROJECT_FILES_BUCKET)
      .remove(files)
    if (storageError) {
      console.warn('deleteProjectServer storage:', projectId, storageError.message)
    }
  }

  const { data, error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId)
    .select('id')

  if (error) {
    return { error: error.message }
  }

  if (!data?.length) {
    return { error: 'Project not found or delete blocked' }
  }

  return { error: null }
}

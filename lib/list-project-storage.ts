import type { SupabaseClient } from '@supabase/supabase-js'

const BUCKET = 'project-files'

/** Recursively list all file object paths under a storage prefix. */
export async function listStoragePaths(
  supabase: SupabaseClient,
  prefix: string
): Promise<string[]> {
  const paths: string[] = []
  const { data, error } = await supabase.storage.from(BUCKET).list(prefix, {
    limit: 1000,
  })

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

export async function listProjectStoragePaths(
  supabase: SupabaseClient,
  projectId: string
): Promise<string[]> {
  return listStoragePaths(supabase, projectId)
}

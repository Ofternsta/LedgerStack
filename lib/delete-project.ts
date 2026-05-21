import { supabase } from '@/lib/supabase'

const BUCKET = 'project-files'

async function listStoragePaths(prefix: string): Promise<string[]> {
  const paths: string[] = []
  const { data, error } = await supabase.storage.from(BUCKET).list(prefix, {
    limit: 1000,
  })

  if (error || !data) return paths

  for (const item of data) {
    if (!item.name) continue
    const path = prefix ? `${prefix}/${item.name}` : item.name
    if (item.id === null) {
      paths.push(...(await listStoragePaths(path)))
    } else {
      paths.push(path)
    }
  }

  return paths
}

export async function deleteProject(projectId: string): Promise<string | null> {
  const { data: deletedClaims, error: claimsError } = await supabase
    .from('claims')
    .delete()
    .eq('project_id', projectId)
    .select('id')

  if (claimsError) {
    return `Could not remove claims: ${claimsError.message}`
  }

  const { data: deletedProjects, error: projectError } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId)
    .select('id')

  if (projectError) {
    return `Could not remove project: ${projectError.message}`
  }

  if (!deletedProjects?.length) {
    return (
      'Delete was blocked by the database. In Supabase SQL Editor, run the script ' +
      'supabase/anon-app-permissions.sql, then try again.'
    )
  }

  // Best-effort file cleanup — do not block delete if storage fails
  const files = await listStoragePaths(projectId)
  if (files.length) {
    await supabase.storage.from(BUCKET).remove(files)
  }

  void deletedClaims

  return null
}

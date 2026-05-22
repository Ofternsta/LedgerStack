import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

const BUCKET = 'project-files'

async function listStoragePaths(
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

/** Remove all project storage for organizations this user admins */
async function deleteAdminStorage(
  supabase: SupabaseClient,
  userId: string
) {
  const { data: orgs } = await supabase
    .from('organizations')
    .select('id')
    .eq('admin_user_id', userId)

  if (!orgs?.length) return

  const orgIds = orgs.map((o) => o.id)
  const { data: projects } = await supabase
    .from('projects')
    .select('id')
    .in('organization_id', orgIds)

  const projectIds = (projects || []).map((p) => p.id)
  const { data: userProjects } = await supabase
    .from('projects')
    .select('id')
    .eq('user_id', userId)

  for (const p of userProjects || []) {
    if (!projectIds.includes(p.id)) projectIds.push(p.id)
  }

  const allPaths: string[] = []
  for (const projectId of projectIds) {
    allPaths.push(...(await listStoragePaths(supabase, projectId)))
  }

  if (allPaths.length) {
    await supabase.storage.from(BUCKET).remove(allPaths)
  }
}

export async function deleteUserAccount(
  supabase: SupabaseClient,
  targetUserId: string
): Promise<{ error: string | null }> {
  await deleteAdminStorage(supabase, targetUserId)

  const { error } = await supabase.auth.admin.deleteUser(targetUserId)

  if (error) {
    return { error: error.message }
  }

  return { error: null }
}

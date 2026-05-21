import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { DEMO_PROJECT_NAMES } from '@/lib/demo-projects'

const BUCKET = 'project-files'
const DEMO_IDS = [
  '0432fc8d-cfed-48c8-b235-8ac730f80e09',
  '74fc640f-a25e-4169-ab9c-6b712feea353',
  '0c27f8c2-f73f-4dd5-b489-2dde338423e6',
]

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
    if (item.id === null) paths.push(...(await listStoragePaths(supabase, path)))
    else paths.push(path)
  }
  return paths
}

/** One-time cleanup. Requires SUPABASE_SERVICE_ROLE_KEY on the server (e.g. Vercel env). */
export async function POST() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    return NextResponse.json(
      {
        error:
          'Add SUPABASE_SERVICE_ROLE_KEY to Vercel env vars (Supabase → Settings → API → service_role), redeploy, then POST again. Or run supabase/clear-demo-projects.sql in the SQL Editor.',
      },
      { status: 503 }
    )
  }

  const supabase = createClient(url, serviceKey)

  let files: string[] = []
  for (const id of DEMO_IDS) {
    files.push(...(await listStoragePaths(supabase, id)))
  }
  if (files.length) {
    const { error } = await supabase.storage.from(BUCKET).remove(files)
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  const { error: claimsError } = await supabase
    .from('claims')
    .delete()
    .in('project_id', DEMO_IDS)
  if (claimsError) {
    return NextResponse.json({ error: claimsError.message }, { status: 500 })
  }

  const { error: projectsError } = await supabase
    .from('projects')
    .delete()
    .in('id', DEMO_IDS)
  if (projectsError) {
    return NextResponse.json({ error: projectsError.message }, { status: 500 })
  }

  const { data: remaining } = await supabase.from('projects').select('customer_name')

  return NextResponse.json({
    removed: DEMO_PROJECT_NAMES,
    remaining: remaining?.map((p) => p.customer_name) ?? [],
  })
}

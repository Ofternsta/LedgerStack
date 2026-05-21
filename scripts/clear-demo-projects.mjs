/**
 * Removes demo projects (John Smith, Jake Gipson, Jake Smith).
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env.local (Dashboard → Settings → API).
 * Or run supabase/clear-demo-projects.sql in the SQL Editor instead.
 */
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dirname, '..', '.env.local')

for (const line of readFileSync(envPath, 'utf8').split('\n')) {
  const m = line.match(/^([^#=]+)=(.*)$/)
  if (m) process.env[m[1].trim()] = m[2].trim()
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const DEMO_NAMES = ['John Smith', 'Jake Gipson', 'Jake Smith']
const DEMO_IDS = [
  '0432fc8d-cfed-48c8-b235-8ac730f80e09',
  '74fc640f-a25e-4169-ab9c-6b712feea353',
  '0c27f8c2-f73f-4dd5-b489-2dde338423e6',
]
const BUCKET = 'project-files'

if (!url || !serviceKey) {
  console.error(
    'Missing SUPABASE_SERVICE_ROLE_KEY in .env.local.\n' +
      'Add it from Supabase → Project Settings → API → service_role (secret),\n' +
      'or run supabase/clear-demo-projects.sql in the SQL Editor.'
  )
  process.exit(1)
}

const sb = createClient(url, serviceKey)

async function listAllFiles(prefix) {
  const paths = []
  const { data, error } = await sb.storage.from(BUCKET).list(prefix, { limit: 1000 })
  if (error || !data) return paths
  for (const item of data) {
    if (!item.name) continue
    const p = prefix ? `${prefix}/${item.name}` : item.name
    if (item.id === null) paths.push(...(await listAllFiles(p)))
    else paths.push(p)
  }
  return paths
}

async function main() {
  let files = []
  for (const id of DEMO_IDS) {
    files.push(...(await listAllFiles(id)))
  }
  if (files.length) {
    const { error } = await sb.storage.from(BUCKET).remove(files)
    if (error) throw new Error(`Storage: ${error.message}`)
    console.log(`Removed ${files.length} file(s) from storage`)
  }

  const { error: claimsErr } = await sb
    .from('claims')
    .delete()
    .in('project_id', DEMO_IDS)
  if (claimsErr) throw new Error(`Claims: ${claimsErr.message}`)
  console.log('Removed claims')

  const { error: projErr } = await sb
    .from('projects')
    .delete()
    .in('id', DEMO_IDS)
  if (projErr) throw new Error(`Projects: ${projErr.message}`)
  console.log('Removed projects:', DEMO_NAMES.join(', '))

  const { data: left } = await sb.from('projects').select('customer_name')
  console.log(
    left?.length
      ? `Remaining projects: ${left.map((p) => p.customer_name).join(', ')}`
      : 'No projects left — fresh start.'
  )
}

main().catch((e) => {
  console.error(e.message)
  process.exit(1)
})

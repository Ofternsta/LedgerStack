/**
 * Removes uploaded files for demo projects (Storage API — SQL cannot do this).
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
const key =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const DEMO_IDS = [
  '0432fc8d-cfed-48c8-b235-8ac730f80e09',
  '74fc640f-a25e-4169-ab9c-6b712feea353',
  '0c27f8c2-f73f-4dd5-b489-2dde338423e6',
]
const BUCKET = 'project-files'

const sb = createClient(url, key)

async function listAll(prefix) {
  const paths = []
  const { data, error } = await sb.storage.from(BUCKET).list(prefix, { limit: 1000 })
  if (error || !data) return paths
  for (const item of data) {
    if (!item.name) continue
    const p = prefix ? `${prefix}/${item.name}` : item.name
    if (item.id === null) paths.push(...(await listAll(p)))
    else paths.push(p)
  }
  return paths
}

let files = []
for (const id of DEMO_IDS) {
  files.push(...(await listAll(id)))
}

if (!files.length) {
  console.log('No demo files in storage.')
  process.exit(0)
}

const { error } = await sb.storage.from(BUCKET).remove(files)
if (error) {
  console.error(error.message)
  process.exit(1)
}

console.log(`Removed ${files.length} file(s) from storage.`)

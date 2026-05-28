import { NextResponse } from 'next/server'
import {
  assertAdminOwnsClientAccess,
  loadClientSharingPayload,
  setSharedFilePaths,
} from '@/lib/client-shared-files'
import { requireAuth } from '@/lib/require-auth'

/** GET files + shared selection for a client access row (admin). */
export async function GET(req: Request) {
  const { supabase, user } = await requireAuth()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const params = new URL(req.url).searchParams
  const projectId = params.get('project_id')
  const accessId = params.get('access_id')

  if (!projectId || !accessId) {
    return NextResponse.json(
      { error: 'project_id and access_id are required' },
      { status: 400 }
    )
  }

  const gate = await assertAdminOwnsClientAccess(
    supabase,
    user.id,
    projectId,
    accessId
  )
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: 403 })
  }

  try {
    const payload = await loadClientSharingPayload(projectId, accessId)
    return NextResponse.json(payload)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load sharing'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/** PUT update which files a client can view. */
export async function PUT(req: Request) {
  const { supabase, user } = await requireAuth()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const projectId = String(body.project_id || '')
  const accessId = String(body.access_id || '')
  const filePaths = Array.isArray(body.file_paths)
    ? (body.file_paths as string[])
    : []

  if (!projectId || !accessId) {
    return NextResponse.json(
      { error: 'project_id and access_id are required' },
      { status: 400 }
    )
  }

  const gate = await assertAdminOwnsClientAccess(
    supabase,
    user.id,
    projectId,
    accessId
  )
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: 403 })
  }

  try {
    await setSharedFilePaths(accessId, projectId, filePaths)
    return NextResponse.json({ ok: true, shared_count: filePaths.length })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to save sharing'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import {
  getApprovedClientAccessRow,
  getSharedFilePaths,
} from '@/lib/client-shared-files'
import { projectIdFromEvidencePath } from '@/lib/org-admin'
import { assertProjectMemberPermission } from '@/lib/member-permissions-server'
import { requireAuth } from '@/lib/require-auth'
import { createServiceClient } from '@/lib/supabase/service'

const BUCKET = 'project-files'

/** Signed download URL for project evidence (clients included). */
export async function GET(req: Request) {
  try {
    const { supabase, user } = await requireAuth()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const params = new URL(req.url).searchParams
    const filePath = params.get('file_path')
    const projectId =
      params.get('project_id') || projectIdFromEvidencePath(filePath || '')

    if (!filePath || !projectId) {
      return NextResponse.json(
        { error: 'file_path and project_id are required' },
        { status: 400 }
      )
    }

    const pathProjectId = projectIdFromEvidencePath(filePath)
    if (pathProjectId && pathProjectId !== projectId) {
      return NextResponse.json({ error: 'Invalid file path' }, { status: 400 })
    }

    const viewGate = await assertProjectMemberPermission(
      supabase,
      user.id,
      projectId,
      'can_view_files',
      { email: user.email }
    )
    if (!viewGate.ok) {
      return NextResponse.json(
        { error: viewGate.error },
        { status: viewGate.status }
      )
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    if (profile?.role === 'client') {
      const access = await getApprovedClientAccessRow(
        supabase,
        projectId,
        user.id,
        user.email
      )
      if (!access) {
        return NextResponse.json(
          { error: 'You do not have access to this project.' },
          { status: 403 }
        )
      }
      const sharedPaths = await getSharedFilePaths(access.id)
      if (!sharedPaths.has(filePath)) {
        return NextResponse.json(
          { error: 'This file has not been shared with you.' },
          { status: 403 }
        )
      }
    }

    const service = createServiceClient()
    const { data, error } = await service.storage
      .from(BUCKET)
      .createSignedUrl(filePath, 3600)

    if (error || !data?.signedUrl) {
      return NextResponse.json(
        { error: error?.message || 'Could not open file' },
        { status: 500 }
      )
    }

    return NextResponse.json({ signedUrl: data.signedUrl })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Could not open file'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

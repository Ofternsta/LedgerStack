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

function contentDispositionAttachment(fileName: string): string {
  const ascii = fileName.replace(/[^\x20-\x7E]/g, '_') || 'download'
  const encoded = encodeURIComponent(fileName)
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encoded}`
}

/** Stream a project file as a download (Content-Disposition: attachment). */
export async function GET(req: Request) {
  try {
    const { supabase, user } = await requireAuth()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const params = new URL(req.url).searchParams
    const filePath = params.get('file_path')
    const fileName = params.get('file_name')?.trim()
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

    const downloadGate = await assertProjectMemberPermission(
      supabase,
      user.id,
      projectId,
      'can_download_files',
      { email: user.email }
    )
    if (!downloadGate.ok) {
      return NextResponse.json(
        { error: downloadGate.error },
        { status: downloadGate.status }
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
    const { data: blob, error } = await service.storage
      .from(BUCKET)
      .download(filePath)

    if (error || !blob) {
      return NextResponse.json(
        { error: error?.message || 'Could not download file' },
        { status: 500 }
      )
    }

    const leafName = fileName || filePath.split('/').pop() || 'download'

    return new Response(blob, {
      headers: {
        'Content-Type': blob.type || 'application/octet-stream',
        'Content-Disposition': contentDispositionAttachment(leafName),
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Could not download file'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

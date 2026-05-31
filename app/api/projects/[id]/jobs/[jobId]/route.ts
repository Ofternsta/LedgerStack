import { NextResponse } from 'next/server'
import { deleteJobServer } from '@/lib/delete-job-server'
import { loadUserAccessServer } from '@/lib/load-access-server'
import { requireAuth } from '@/lib/require-auth'
import { createServiceClient } from '@/lib/supabase/service'

type RouteContext = { params: Promise<{ id: string; jobId: string }> }

export async function DELETE(_req: Request, context: RouteContext) {
  try {
    const { id: projectId, jobId } = await context.params
    const { user } = await requireAuth()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { access } = await loadUserAccessServer()
    if (!access?.canCreateProject || !access.organizationId) {
      return NextResponse.json(
        { error: 'You do not have permission to delete jobs.' },
        { status: 403 }
      )
    }

    const service = createServiceClient()
    const { data: project } = await service
      .from('projects')
      .select('organization_id')
      .eq('id', projectId)
      .maybeSingle()

    if (!project?.organization_id || project.organization_id !== access.organizationId) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const result = await deleteJobServer(service, projectId, jobId)

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Delete job failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

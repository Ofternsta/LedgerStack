import { NextResponse } from 'next/server'
import { deleteProjectServer } from '@/lib/delete-project-server'
import { loadUserAccessServer } from '@/lib/load-access-server'
import { requireAuth } from '@/lib/require-auth'
import { createServiceClient } from '@/lib/supabase/service'
import { touchProjectActivity } from '@/lib/touch-project-activity'

type RouteContext = { params: Promise<{ id: string }> }

export async function DELETE(_req: Request, context: RouteContext) {
  try {
    const { id: projectId } = await context.params
    const { supabase, user } = await requireAuth()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { access } = await loadUserAccessServer()
    if (!access?.canDeleteProject) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: project } = await supabase
      .from('projects')
      .select('id, organization_id')
      .eq('id', projectId)
      .maybeSingle()

    if (!project?.organization_id) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    if (project.organization_id !== access.organizationId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const service = createServiceClient()
    const { error } = await deleteProjectServer(service, projectId)
    if (error) {
      return NextResponse.json({ error }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Delete failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(req: Request, context: RouteContext) {
  try {
    const { id: projectId } = await context.params
    const { supabase, user } = await requireAuth()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { access } = await loadUserAccessServer()
    if (!access?.canManageSystemSettings) {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    }

    const { data: project } = await supabase
      .from('projects')
      .select('id, organization_id')
      .eq('id', projectId)
      .maybeSingle()

    if (!project?.organization_id) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    if (project.organization_id !== access.organizationId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json().catch(() => ({}))
    const customerName = body.customer_name?.trim()
    const projectAddress = body.project_address?.trim()
    const notes =
      body.notes !== undefined ? String(body.notes || '').trim() : undefined

    const update: Record<string, string> = {}
    if (customerName) update.customer_name = customerName
    if (projectAddress) update.project_address = projectAddress
    if (notes !== undefined) update.notes = notes

    if (!Object.keys(update).length) {
      return NextResponse.json(
        { error: 'customer_name or project_address required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('projects')
      .update(update)
      .eq('id', projectId)
      .select('id, customer_name, project_address, notes, created_at')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    await touchProjectActivity(supabase, projectId)

    const claimUpdate: Record<string, string> = {}
    if (customerName) claimUpdate.client_name = customerName
    if (projectAddress) claimUpdate.property_address = projectAddress
    if (Object.keys(claimUpdate).length) {
      await supabase.from('claims').update(claimUpdate).eq('project_id', projectId)
    }

    return NextResponse.json({ project: data })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Update failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

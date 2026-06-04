import { NextResponse } from 'next/server'
import { createSignatureRequest } from '@/lib/signature-requests-server'
import { requireOrgPlanFeature } from '@/lib/plan-guard'
import { requireAuth } from '@/lib/require-auth'
import { createServiceClient } from '@/lib/supabase/service'

/** GET signature requests for a project (admin) or current client */
export async function GET(req: Request) {
  const { supabase, user } = await requireAuth()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const params = new URL(req.url).searchParams
  const projectId = params.get('project_id')
  const mine = params.get('mine') === '1'

  const service = createServiceClient()

  if (mine) {
    const email = user.email?.trim().toLowerCase()
    if (!email) {
      return NextResponse.json({ requests: [], pending_count: 0 })
    }

    let query = service
      .from('signature_requests')
      .select('*')
      .eq('client_email', email)
      .order('requested_at', { ascending: false })

    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    const { data, error } = await query
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const requests = data || []
    const pending_count = requests.filter((r) =>
      ['pending', 'viewed'].includes(r.status as string)
    ).length

    return NextResponse.json({ requests, pending_count })
  }

  if (!projectId) {
    return NextResponse.json({ error: 'project_id required' }, { status: 400 })
  }

  const { data: project } = await supabase
    .from('projects')
    .select('organization_id')
    .eq('id', projectId)
    .maybeSingle()

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  const { data: org } = await supabase
    .from('organizations')
    .select('id')
    .eq('id', project.organization_id)
    .eq('admin_user_id', user.id)
    .maybeSingle()

  if (!org) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const accessId = params.get('access_id')
  let query = service
    .from('signature_requests')
    .select('*')
    .eq('project_id', projectId)
    .order('requested_at', { ascending: false })

  if (accessId) {
    query = query.eq('project_client_access_id', accessId)
  }

  const { data, error } = await query
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ requests: data || [] })
}

/** POST create signature request (admin) */
export async function POST(req: Request) {
  const { supabase, user } = await requireAuth()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const projectId = String(body.project_id || '')
  const projectClientAccessId = String(body.project_client_access_id || '')
  const sourceFilePath = String(body.source_file_path || '')

  if (!projectId || !projectClientAccessId || !sourceFilePath) {
    return NextResponse.json(
      {
        error:
          'project_id, project_client_access_id, and source_file_path are required',
      },
      { status: 400 }
    )
  }

  const { data: project } = await supabase
    .from('projects')
    .select('organization_id')
    .eq('id', projectId)
    .maybeSingle()

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  const planGate = await requireOrgPlanFeature(
    supabase,
    project.organization_id,
    'clientPortal',
    'Client portal and e-signatures'
  )
  if (!planGate.ok) {
    return NextResponse.json({ error: planGate.error }, { status: 403 })
  }

  const result = await createSignatureRequest({
    supabase,
    adminUserId: user.id,
    projectId,
    projectClientAccessId,
    sourceFilePath,
  })

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status || 500 }
    )
  }

  return NextResponse.json({ request: result.request })
}

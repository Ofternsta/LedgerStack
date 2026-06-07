import { NextResponse } from 'next/server'
import {
  completeSignatureRequest,
  refreshEmbeddedSigningUrl,
} from '@/lib/signature-requests-server'
import type { SignatureRequestRow } from '@/lib/signature-request-types'
import { requireAuth } from '@/lib/require-auth'
import { createServiceClient } from '@/lib/supabase/service'

type RouteContext = { params: Promise<{ id: string }> }

/** GET one request (client owner or org admin) */
export async function GET(req: Request, context: RouteContext) {
  const { supabase, user } = await requireAuth()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await context.params
  const forceReissue =
    new URL(req.url).searchParams.get('reissue') === '1'
  const service = createServiceClient()

  const { data: request, error } = await service
    .from('signature_requests')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error || !request) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const row = request as SignatureRequestRow
  const email = user.email?.trim().toLowerCase()
  const isClient =
    email && row.client_email.toLowerCase() === email

  if (!isClient) {
    const { data: org } = await supabase
      .from('organizations')
      .select('id')
      .eq('id', row.organization_id)
      .eq('admin_user_id', user.id)
      .maybeSingle()

    if (!org) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const signing =
    isClient && ['pending', 'viewed', 'expired'].includes(row.status)
      ? await refreshEmbeddedSigningUrl(row, { forceReissue })
      : { url: null as string | null }

  return NextResponse.json({
    request: row,
    signing_url: signing.url,
    signing_error: signing.error || null,
  })
}

/** POST sync completion after embedded sign (client or webhook backup) */
export async function POST(_req: Request, context: RouteContext) {
  const { supabase, user } = await requireAuth()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await context.params
  const service = createServiceClient()

  const { data: request } = await service
    .from('signature_requests')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (!request) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const email = user.email?.trim().toLowerCase()
  const isClient =
    email &&
    String(request.client_email).toLowerCase() === email

  const { data: org } = await supabase
    .from('organizations')
    .select('id')
    .eq('id', request.organization_id)
    .eq('admin_user_id', user.id)
    .maybeSingle()

  if (!isClient && !org) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const result = await completeSignatureRequest(id)
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 })
  }

  const { data: updated } = await service
    .from('signature_requests')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  return NextResponse.json({ request: updated })
}

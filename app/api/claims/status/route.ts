import { NextResponse } from 'next/server'
import { isClaimStatus, normalizeClaimStatus } from '@/lib/claim-status'
import { loadUserAccessServer } from '@/lib/load-access-server'
import { requireAuth } from '@/lib/require-auth'

export async function PATCH(req: Request) {
  try {
    const { supabase, user } = await requireAuth()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { access } = await loadUserAccessServer()
    if (!access?.canUpdateClaimInfo) {
      const message = !access?.plan
        ? 'Active subscription required. Open Billing or complete your plan setup.'
        : access.role === 'client'
          ? 'Clients have view-only access.'
          : access.workerStatus !== 'approved' && access.role === 'worker'
            ? 'Your worker account must be approved by an admin.'
            : 'You do not have permission to update claim status.'
      return NextResponse.json({ error: message }, { status: 403 })
    }

    const body = await req.json().catch(() => ({}))
    const claimId = String(body.claim_id || '').trim()
    const projectId = String(body.project_id || '').trim()
    const rawStatus = String(body.status || '').trim()

    if (!claimId || !projectId) {
      return NextResponse.json(
        { error: 'claim_id and project_id are required' },
        { status: 400 }
      )
    }

    if (!isClaimStatus(rawStatus)) {
      return NextResponse.json({ error: 'Invalid claim status' }, { status: 400 })
    }

    const { data: claim, error: fetchError } = await supabase
      .from('claims')
      .select('id, project_id, status')
      .eq('id', claimId)
      .eq('project_id', projectId)
      .maybeSingle()

    if (fetchError || !claim) {
      return NextResponse.json({ error: 'Claim not found' }, { status: 404 })
    }

    const previousStatus = normalizeClaimStatus(claim.status)

    const { data: updated, error: updateError } = await supabase
      .from('claims')
      .update({ status: rawStatus })
      .eq('id', claimId)
      .select('id, status, client_name, property_address')
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    if (previousStatus !== rawStatus) {
      await supabase.from('claim_timeline_events').insert({
        claim_id: claimId,
        title: 'Status updated',
        description: `${previousStatus} → ${rawStatus}`,
        event_date: new Date().toISOString().slice(0, 10),
        source: 'manual',
      })
    }

    return NextResponse.json({ claim: updated })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Update failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

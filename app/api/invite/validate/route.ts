import { NextResponse } from 'next/server'
import { enforceRateLimit } from '@/lib/api-rate-limit'
import { getOrgPlanContext } from '@/lib/org-plan'
import { createServiceClient } from '@/lib/supabase/service'
import { lookupOrganizationByInvite } from '@/lib/validate-invite'
import { createClient } from '@/lib/supabase/server'

/** Public: check that a procedural invite code belongs to a real company */
export async function GET(req: Request) {
  const limited = await enforceRateLimit(req, 'invite:validate', 40)
  if (limited) return limited

  const code = new URL(req.url).searchParams.get('code') || ''
  const supabase = await createClient()
  const result = await lookupOrganizationByInvite(supabase, code)

  if (!result.ok) {
    return NextResponse.json({ valid: false, error: result.error }, { status: 400 })
  }

  const service = createServiceClient()
  const planCtx = await getOrgPlanContext(service, result.organizationId)
  if (!planCtx?.entitlements.workerAccounts) {
    return NextResponse.json(
      {
        valid: false,
        error:
          'This company must upgrade to Professional before adding workers.',
      },
      { status: 400 }
    )
  }

  return NextResponse.json({
    valid: true,
    organization_name: result.organizationName,
    invite_code: result.code,
  })
}

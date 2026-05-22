import { NextResponse } from 'next/server'
import { lookupOrganizationByInvite } from '@/lib/validate-invite'
import { createClient } from '@/lib/supabase/server'

/** Public: check that a procedural invite code belongs to a real company */
export async function GET(req: Request) {
  const code = new URL(req.url).searchParams.get('code') || ''
  const supabase = await createClient()
  const result = await lookupOrganizationByInvite(supabase, code)

  if (!result.ok) {
    return NextResponse.json({ valid: false, error: result.error }, { status: 400 })
  }

  return NextResponse.json({
    valid: true,
    organization_name: result.organizationName,
    invite_code: result.code,
  })
}

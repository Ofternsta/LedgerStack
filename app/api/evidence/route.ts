import { NextResponse } from 'next/server'
import { deleteEvidence, listEvidence } from '@/lib/evidence-storage'
import {
  isOrganizationAdmin,
  projectIdFromEvidencePath,
} from '@/lib/org-admin'
import { assertProjectMemberPermission } from '@/lib/member-permissions-server'
import { getProjectOrgId } from '@/lib/staff-project-access'
import { requireAuth } from '@/lib/require-auth'
import { updateEvidenceMeta } from '@/lib/update-evidence-meta'

export async function GET(req: Request) {
  try {
    const { supabase, user } = await requireAuth()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const params = new URL(req.url).searchParams
    const claimId = params.get('claim_id')
    const projectId = params.get('project_id')

    if (!claimId || !projectId) {
      return NextResponse.json(
        { error: 'claim_id and project_id are required' },
        { status: 400 }
      )
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

    const evidence = await listEvidence(supabase, projectId, claimId)
    return NextResponse.json({ evidence })
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Failed to load documents'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

async function requireEvidenceDeleteAccess(
  supabase: Awaited<ReturnType<typeof requireAuth>>['supabase'],
  userId: string,
  filePath: string
) {
  const projectId = projectIdFromEvidencePath(filePath)
  if (!projectId) {
    return { ok: false as const, error: 'Invalid file path', status: 400 }
  }

  const organizationId = await getProjectOrgId(supabase, projectId)
  if (!organizationId) {
    return { ok: false as const, error: 'Project not found', status: 404 }
  }

  if (await isOrganizationAdmin(supabase, organizationId, userId)) {
    return { ok: true as const }
  }

  const gate = await assertProjectMemberPermission(
    supabase,
    userId,
    projectId,
    'can_delete'
  )
  if (!gate.ok) {
    return { ok: false as const, error: gate.error, status: gate.status }
  }

  return { ok: true as const }
}

async function requireEvidenceOrgAdmin(
  supabase: Awaited<ReturnType<typeof requireAuth>>['supabase'],
  userId: string,
  filePath: string
) {
  const projectId = projectIdFromEvidencePath(filePath)
  if (!projectId) {
    return { ok: false as const, error: 'Invalid file path' }
  }

  const organizationId = await getProjectOrgId(supabase, projectId)
  if (!organizationId) {
    return { ok: false as const, error: 'Project not found' }
  }

  const isAdmin = await isOrganizationAdmin(
    supabase,
    organizationId,
    userId
  )
  if (!isAdmin) {
    return { ok: false as const, error: 'Organization admin only' }
  }

  return { ok: true as const }
}

/** PATCH update AI summary / category (organization admin only) */
export async function PATCH(req: Request) {
  try {
    const { supabase, user } = await requireAuth()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const filePath = body.file_path as string
    const summary = body.summary as string | undefined
    const evidenceType = body.evidence_type as string | undefined

    if (!filePath) {
      return NextResponse.json({ error: 'file_path required' }, { status: 400 })
    }

    const gate = await requireEvidenceOrgAdmin(supabase, user.id, filePath)
    if (!gate.ok) {
      return NextResponse.json({ error: gate.error }, { status: 403 })
    }

    const evidence = await updateEvidenceMeta(supabase, filePath, {
      summary,
      evidence_type: evidenceType,
    })

    return NextResponse.json({ evidence })
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Failed to update document'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const { supabase, user } = await requireAuth()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const filePath = new URL(req.url).searchParams.get('file_path')

    if (!filePath) {
      return NextResponse.json(
        { error: 'file_path is required' },
        { status: 400 }
      )
    }

    const gate = await requireEvidenceDeleteAccess(supabase, user.id, filePath)
    if (!gate.ok) {
      return NextResponse.json({ error: gate.error }, { status: gate.status })
    }

    await deleteEvidence(supabase, filePath)
    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Failed to delete document'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

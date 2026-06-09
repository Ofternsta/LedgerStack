import { NextResponse } from 'next/server'
import { loadUserAccessServer } from '@/lib/load-access-server'
import {
  ensureSignedDocumentsCategoryOnProject,
  normalizeFileCategoriesDraft,
  normalizeFileCategoryLabel,
  parseProjectFileCategories,
  serializeProjectFileCategories,
  validateFileCategories,
  type FileCategory,
} from '@/lib/project-file-categories'
import { repairSignedEvidenceOnProject } from '@/lib/repair-signed-evidence'
import { assertProjectMemberPermission } from '@/lib/member-permissions-server'
import { createServiceClient } from '@/lib/supabase/service'
import { requireAuth } from '@/lib/require-auth'
import { touchProjectActivity } from '@/lib/touch-project-activity'
import { listAllProjectEvidence } from '@/lib/evidence-storage'
import { updateEvidenceMeta } from '@/lib/update-evidence-meta'

type RouteContext = { params: Promise<{ id: string }> }

async function loadProject(
  supabase: Awaited<ReturnType<typeof requireAuth>>['supabase'],
  projectId: string
) {
  const { data, error } = await supabase
    .from('projects')
    .select('id, organization_id, file_categories')
    .eq('id', projectId)
    .maybeSingle()

  if (error || !data) return null
  return data
}

async function remapEvidenceCategories(
  projectId: string,
  previous: FileCategory[],
  next: FileCategory[]
) {
  const service = createServiceClient()
  const fallbackLabel = next[0]?.label
  if (!fallbackLabel) return

  const nextKeys = new Set(next.map((c) => c.key))
  const files = await listAllProjectEvidence(service, projectId)

  for (const row of files) {
    const raw = row.evidence_type as string
    let newLabel: string | null = null

    const matchedPrev = previous.find(
      (c) =>
        c.label.toLowerCase() === raw.trim().toLowerCase() || c.key === raw
    )

    if (matchedPrev) {
      if (!nextKeys.has(matchedPrev.key)) {
        newLabel = fallbackLabel
      } else {
        const updated = next.find((c) => c.key === matchedPrev.key)
        if (updated && updated.label !== matchedPrev.label) {
          newLabel = updated.label
        }
      }
    } else {
      newLabel = normalizeFileCategoryLabel(raw, next)
      if (newLabel === raw) continue
    }

    if (newLabel && newLabel !== raw) {
      try {
        await updateEvidenceMeta(service, row.file_path, {
          evidence_type: newLabel,
        })
      } catch (err) {
        console.warn('Failed to remap evidence category:', row.file_path, err)
      }
    }
  }
}

export async function GET(req: Request, context: RouteContext) {
  try {
    const { id: projectId } = await context.params
    const { supabase, user } = await requireAuth()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const project = await loadProject(supabase, projectId)
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
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

    const service = createServiceClient()
    const categories = await ensureSignedDocumentsCategoryOnProject(
      service,
      projectId
    )

    const url = new URL(req.url)
    const repair = url.searchParams.get('repair') === '1'
    if (repair) {
      const { access } = await loadUserAccessServer()
      if (access?.canManageSystemSettings) {
        await repairSignedEvidenceOnProject(service, projectId)
      }
    }

    return NextResponse.json({ categories })
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Failed to load categories'
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

    const project = await loadProject(supabase, projectId)
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    if (project.organization_id !== access.organizationId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const previous = parseProjectFileCategories(project.file_categories)

    const body = await req.json().catch(() => ({}))
    const categoriesRaw = body.categories
    if (!Array.isArray(categoriesRaw)) {
      return NextResponse.json(
        { error: 'categories array is required' },
        { status: 400 }
      )
    }

    const categories = normalizeFileCategoriesDraft(
      categoriesRaw.map((c: { key?: string; label?: string }) => ({
        key: String(c.key || ''),
        label: String(c.label || ''),
      }))
    )

    const validation = validateFileCategories(categories)
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const { error: updateError } = await supabase
      .from('projects')
      .update({
        file_categories: serializeProjectFileCategories(categories),
      })
      .eq('id', projectId)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    await remapEvidenceCategories(projectId, previous, categories)
    await touchProjectActivity(supabase, projectId)

    return NextResponse.json({ categories })
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Failed to update categories'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { analyzeEvidence } from '@/lib/analyze-evidence'
import {
  compressEvidenceImage,
  fileFromCompressed,
} from '@/lib/compress-evidence'
import { extractTextFromFile } from '@/lib/extract-text'
import { loadEvidenceUploader } from '@/lib/evidence-uploader'
import {
  newEvidenceId,
  readEvidenceMeta,
  saveEvidence,
  uploadEvidenceFile,
} from '@/lib/evidence-storage'
import { getOrgPlanContext } from '@/lib/org-plan'
import { validateUploadForPlan } from '@/lib/plan-enforcement'
import { assertProjectMemberPermission } from '@/lib/member-permissions-server'
import { requireAuth } from '@/lib/require-auth'
import { normalizeUploadFile } from '@/lib/file-meta'
import { validateUploadSize } from '@/lib/upload-limits'
import { touchProjectActivity } from '@/lib/touch-project-activity'
import {
  categoryLabels,
  parseProjectFileCategories,
} from '@/lib/project-file-categories'

export const maxDuration = 60

const BUCKET = 'project-files'

async function fileFromStorage(
  supabase: Awaited<ReturnType<typeof requireAuth>>['supabase'],
  filePath: string,
  fileName: string,
  fileType: string
): Promise<File> {
  const { data, error } = await supabase.storage.from(BUCKET).download(filePath)

  if (error || !data) {
    throw new Error(error?.message || 'Could not read uploaded file from storage')
  }

  const buffer = Buffer.from(await data.arrayBuffer())
  return new File([buffer], fileName, {
    type: fileType || 'application/octet-stream',
  })
}

export async function POST(req: Request) {
  try {
    const { supabase, user } = await requireAuth()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const contentType = req.headers.get('content-type') || ''
    let claimId: string | null = null
    let projectId: string | null = null
    let file: File | null = null
    let existingPath: string | null = null

    if (contentType.includes('application/json')) {
      const body = await req.json()
      claimId = body.claim_id ?? null
      projectId = body.project_id ?? null
      existingPath = body.file_path ?? null
      const fileName = body.file_name as string
      const fileType = (body.file_type as string) || ''

      if (!existingPath || !claimId || !projectId || !fileName) {
        return NextResponse.json(
          { error: 'file_path, file_name, claim_id, and project_id are required' },
          { status: 400 }
        )
      }

      file = await fileFromStorage(supabase, existingPath, fileName, fileType)
    } else {
      const formData = await req.formData()
      file = formData.get('file') as File | null
      claimId = formData.get('claim_id') as string | null
      projectId = formData.get('project_id') as string | null
    }

    if (!file || !claimId || !projectId) {
      return NextResponse.json(
        { error: 'file, claim_id, and project_id are required' },
        { status: 400 }
      )
    }

    const sizeError = validateUploadSize(file.size)
    if (sizeError) {
      return NextResponse.json({ error: sizeError }, { status: 400 })
    }

    const { data: project } = await supabase
      .from('projects')
      .select('organization_id, file_categories')
      .eq('id', projectId)
      .maybeSingle()

    if (!project?.organization_id) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const fileCategoryLabels = categoryLabels(
      parseProjectFileCategories(project.file_categories)
    )

    const uploadGate = await assertProjectMemberPermission(
      supabase,
      user.id,
      projectId,
      'can_upload'
    )
    if (!uploadGate.ok) {
      return NextResponse.json(
        { error: uploadGate.error },
        { status: uploadGate.status }
      )
    }

    const planCtx = await getOrgPlanContext(supabase, project.organization_id)
    if (!planCtx) {
      return NextResponse.json(
        { error: 'Active subscription required to upload.' },
        { status: 403 }
      )
    }

    const displayFileName = file.name
    let storageFileName = file.name
    let storedMime = file.type || 'application/octet-stream'

    if (!existingPath) {
      try {
        const compressed = await compressEvidenceImage(file)
        if (compressed) {
          file = fileFromCompressed(compressed, displayFileName)
          storageFileName = compressed.fileName
          storedMime = compressed.mimeType
        }
      } catch (compressErr) {
        console.error('Image optimize failed, storing original:', compressErr)
      }
    }

    const planUploadError = validateUploadForPlan(
      storedMime,
      file.size,
      planCtx.entitlements,
      displayFileName
    )
    if (planUploadError) {
      return NextResponse.json({ error: planUploadError }, { status: 403 })
    }

    const filePath =
      existingPath ||
      (await uploadEvidenceFile(supabase, projectId, claimId, file, {
        storageFileName,
      })).filePath

    let extractedText = await extractTextFromFile(file)
    const analysis = await analyzeEvidence(
      file,
      extractedText,
      fileCategoryLabels
    )
    if (analysis.extractedText?.trim()) {
      extractedText = analysis.extractedText.trim()
    }
    const { evidenceType, summary } = analysis

    const previous = existingPath
      ? await readEvidenceMeta(supabase, existingPath)
      : null

    const uploader =
      previous?.uploaded_by_id && previous.uploaded_by_label
        ? {
            uploaded_by_id: previous.uploaded_by_id,
            uploaded_by_name: previous.uploaded_by_name ?? null,
            uploaded_by_role: previous.uploaded_by_role ?? ('unknown' as const),
            uploaded_by_label: previous.uploaded_by_label,
          }
        : previous?.uploaded_by_id
          ? await loadEvidenceUploader(supabase, previous.uploaded_by_id)
          : await loadEvidenceUploader(supabase, user.id)

    const uploadedAt = previous?.created_at ?? new Date().toISOString()

    const evidence = await saveEvidence(supabase, {
      id: previous?.id ?? newEvidenceId(),
      claim_id: claimId,
      file_name: displayFileName,
      file_path: filePath,
      file_type: storedMime || file.type,
      evidence_type: evidenceType,
      summary,
      extracted_text: extractedText || undefined,
      created_at: uploadedAt,
      ...uploader,
    })

    await touchProjectActivity(supabase, projectId)

    return NextResponse.json({ evidence })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Upload failed'
    console.error('Upload error:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'

export const maxDuration = 60
import { createClient } from '@supabase/supabase-js'
import { analyzeEvidence } from '@/lib/analyze-evidence'
import { extractTextFromFile } from '@/lib/extract-text'
import { validateUploadSize } from '@/lib/upload-limits'
import {
  newEvidenceId,
  saveEvidence,
  uploadEvidenceFile,
} from '@/lib/evidence-storage'

const BUCKET = 'project-files'

function getServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    throw new Error(
      'Server missing Supabase env vars. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY on Vercel.'
    )
  }
  return createClient(url, key)
}

async function fileFromStorage(
  filePath: string,
  fileName: string,
  fileType: string
): Promise<File> {
  const supabase = getServerClient()
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

      file = await fileFromStorage(existingPath, fileName, fileType)
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

    const filePath =
      existingPath ||
      (await uploadEvidenceFile(projectId, claimId, file)).filePath

    const text = await extractTextFromFile(file)
    const { evidenceType, summary } = await analyzeEvidence(file, text)

    const evidence = await saveEvidence({
      id: newEvidenceId(),
      claim_id: claimId,
      file_name: file.name,
      file_path: filePath,
      file_type: file.type,
      evidence_type: evidenceType,
      summary,
      created_at: new Date().toISOString(),
    })

    return NextResponse.json({ evidence })
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Upload failed'
    console.error('Upload error:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

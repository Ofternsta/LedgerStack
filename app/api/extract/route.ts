import { NextResponse } from 'next/server'
import { extractTextFromFile } from '@/lib/extract-text'
import { requireStaffWithActivePlan } from '@/lib/require-staff-with-plan'
import { validateUploadSize } from '@/lib/upload-limits'

export async function POST(req: Request) {
  try {
    const auth = await requireStaffWithActivePlan()
    if (!auth.ok) return auth.response

    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ text: '' })
    }

    const sizeError = validateUploadSize(file.size)
    if (sizeError) {
      return NextResponse.json({ error: sizeError }, { status: 400 })
    }

    const text = await extractTextFromFile(file)
    return NextResponse.json({ text })
  } catch {
    return NextResponse.json({ error: 'Extraction failed' }, { status: 500 })
  }
}

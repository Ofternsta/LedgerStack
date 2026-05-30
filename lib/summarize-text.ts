import { describeFile } from '@/lib/file-meta'

export function summarizeFile(
  file: File,
  extractedText: string,
  evidenceType: string
): string {
  const label = evidenceType || 'Document'
  const text = extractedText.trim()
  const isPdf =
    file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')

  if (text.length > 0) {
    const words = text.split(/\s+/).filter(Boolean).length
    const preview = text.replace(/\s+/g, ' ').slice(0, 280)
    const suffix = text.length > 280 ? '…' : ''
    return `${label}: ${describeFile(file)} — ${words} words extracted. Summary: ${preview}${suffix}`
  }

  if (isPdf) {
    return `${label}: ${describeFile(file)} — PDF stored, but no readable text was found (common with scanned or image-only PDFs). Use Re-scan text on this file after deploy, or re-upload; ensure GROQ_API_KEY is set for OCR.`
  }

  if (file.type.startsWith('image/')) {
    return `${label}: ${describeFile(file)} — image stored; no text extracted. Screenshots of job documents need GROQ_API_KEY and Re-scan text.`
  }

  if (file.type.startsWith('video/')) {
    return `${label}: Video ${describeFile(file)} — stored for claim documentation.`
  }

  if (file.type.startsWith('audio/')) {
    return `${label}: Audio ${describeFile(file)} — stored for job documentation.`
  }

  return `${label}: ${describeFile(file)} — file stored successfully.`
}

/** @deprecated Use summarizeFile; kept for /api/summarize compatibility */
export async function summarizeText(text: string): Promise<string> {
  if (!text.trim()) return 'No text provided'
  const preview = text.replace(/\s+/g, ' ').slice(0, 280)
  return preview.length < text.length ? `${preview}…` : preview
}

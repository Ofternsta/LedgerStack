import 'server-only'
import { ocrImageFromBuffer } from '@/lib/ocr'
import { createPdfParser } from '@/lib/pdf-parse-server'

const TEXT_EXTENSIONS = new Set([
  '.txt',
  '.md',
  '.csv',
  '.json',
  '.xml',
  '.html',
  '.htm',
  '.log',
  '.rtf',
  '.eml',
  '.msg',
])

const MAX_EXTRACT_CHARS = 50_000
/** When embedded text is shorter than this, try page OCR (scanned/image PDFs). */
const MIN_PDF_TEXT_CHARS = 40
const MAX_PDF_OCR_PAGES = 6

function extension(name: string) {
  const i = name.lastIndexOf('.')
  return i >= 0 ? name.slice(i).toLowerCase() : ''
}

function isTextLike(file: File) {
  if (file.type.startsWith('text/')) return true
  return TEXT_EXTENSIONS.has(extension(file.name))
}

type PdfParser = {
  getText: (params?: { first?: number }) => Promise<{ text?: string }>
  getScreenshot: (params?: {
    first?: number
    scale?: number
    imageBuffer?: boolean
    imageDataUrl?: boolean
  }) => Promise<{ pages: Array<{ pageNumber: number; data?: Uint8Array }> }>
  destroy: () => Promise<void>
}

async function ocrPdfPages(parser: PdfParser): Promise<string> {
  if (!process.env.GROQ_API_KEY) return ''

  try {
    const shots = await parser.getScreenshot({
      first: MAX_PDF_OCR_PAGES,
      scale: 1.25,
      imageBuffer: true,
      imageDataUrl: false,
    })

    const parts: string[] = []
    for (const page of shots.pages) {
      if (!page.data?.length) continue
      const buf = Buffer.from(page.data)
      const pageText = await ocrImageFromBuffer(
        buf,
        'image/png',
        `page-${page.pageNumber}.png`
      )
      if (pageText.trim()) {
        parts.push(`--- Page ${page.pageNumber} ---\n${pageText.trim()}`)
      }
    }
    return parts.join('\n\n')
  } catch (err) {
    console.error('PDF OCR fallback failed:', err)
    return ''
  }
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  const parser = (await createPdfParser(buffer)) as PdfParser

  try {
    const result = await parser.getText()
    let text = result.text?.trim() || ''

    if (text.length < MIN_PDF_TEXT_CHARS) {
      const ocrText = await ocrPdfPages(parser)
      if (ocrText.length > text.length) text = ocrText
    }

    return text
  } catch (err) {
    console.error('PDF text extraction failed:', err)
    return ''
  } finally {
    await parser.destroy()
  }
}

export async function extractTextFromFile(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer())
  const ext = extension(file.name)

  if (file.type.startsWith('image/') || /\.(jpe?g|png|gif|webp|heic|bmp)$/i.test(file.name)) {
    const ocr = await ocrImageFromBuffer(buffer, file.type || 'image/jpeg', file.name)
    if (ocr) return truncate(ocr)
    return ''
  }

  if (ext === '.docx' || file.type.includes('wordprocessingml')) {
    try {
      const mammoth = await import('mammoth')
      const result = await mammoth.extractRawText({ buffer })
      return truncate(result.value || '')
    } catch {
      return ''
    }
  }

  if (ext === '.pdf' || file.type === 'application/pdf') {
    const text = await extractPdfText(buffer)
    if (text) return truncate(text)
    return ''
  }

  if (isTextLike(file)) {
    try {
      return truncate(buffer.toString('utf8'))
    } catch {
      return ''
    }
  }

  return ''
}

function truncate(text: string) {
  const trimmed = text.replace(/\0/g, '').trim()
  if (trimmed.length <= MAX_EXTRACT_CHARS) return trimmed
  return trimmed.slice(0, MAX_EXTRACT_CHARS)
}

export { describeFile } from '@/lib/file-meta'

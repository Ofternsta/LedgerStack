import 'server-only'
import {
  categoryLabels,
  defaultFileCategories,
  normalizeFileCategoryLabel,
} from '@/lib/project-file-categories'
import {
  guessEvidenceTypeFromExtractedText,
  guessEvidenceTypeFromFile,
  normalizeEvidenceType,
} from '@/lib/evidence-types'
import { GROQ_TEXT_MODEL, GROQ_VISION_MODEL } from '@/lib/groq-models'
import { summarizeFile } from '@/lib/summarize-text'

export type EvidenceAnalysis = {
  evidenceType: string
  summary: string
  extractedText?: string
}

const MIN_TEXT_FOR_TEXT_ONLY = 80

function buildCategoryRules(allowed: string[]): string {
  return `Pick exactly one category name from the allowed list. Use the closest match.
Allowed categories: ${allowed.join(', ')}

General guidance:
- Photo/image categories: job site or work in progress (not document screenshots)
- Invoice/receipt categories: bills and payments
- Estimate categories: scopes, quotes, proposals
- Email/letter categories: client or partner correspondence
- Report/document categories: contracts, forms, inspection reports, PDF exports

PNG/JPEG screenshots of forms belong in a document/report-style category, not a photo category.`
}

function allowedAsCategories(allowed: string[]) {
  return allowed.map((label, i) => ({
    key: `cat_${i}`,
    label,
  }))
}

function resolveCategory(
  raw: string | undefined,
  file: File,
  extractedText: string,
  allowed: string[]
): string {
  const categories = allowedAsCategories(
    allowed.length ? allowed : categoryLabels(defaultFileCategories())
  )

  if (raw?.trim()) {
    return normalizeFileCategoryLabel(raw, categories)
  }

  const textHint = guessEvidenceTypeFromExtractedText(extractedText)
  if (textHint) {
    return normalizeFileCategoryLabel(textHint, categories)
  }

  const fileHint = guessEvidenceTypeFromFile(file)
  return normalizeFileCategoryLabel(
    normalizeEvidenceType(fileHint),
    categories
  )
}

function isImageFile(file: File): boolean {
  return (
    file.type.startsWith('image/') ||
    /\.(jpe?g|png|gif|webp|heic|bmp)$/i.test(file.name)
  )
}

async function analyzeImageWithVision(
  file: File,
  allowed: string[]
): Promise<{
  evidenceType: string
  summary: string
  extractedText: string
}> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    throw new Error('GROQ_API_KEY not set')
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const base64 = buffer.toString('base64')
  const mime = file.type || 'image/png'
  const dataUrl = `data:${mime};base64,${base64}`
  const rules = buildCategoryRules(allowed)

  const { default: Groq } = await import('groq-sdk')
  const groq = new Groq({ apiKey })

  const completion = await groq.chat.completions.create({
    model: GROQ_VISION_MODEL,
    temperature: 0,
    max_tokens: 2048,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `You analyze contractor job site document images.

Return JSON only:
{
  "category": "<exact name from allowed list>",
  "summary": "<1-2 factual sentences>",
  "extracted_text": "<readable text or empty string>"
}

${rules}

Never invent details not visible in the image.`,
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `File name: ${file.name}\nMIME type: ${mime}`,
          },
          {
            type: 'image_url',
            image_url: { url: dataUrl },
          },
        ],
      },
    ],
  })

  const raw = completion.choices?.[0]?.message?.content?.trim()
  if (!raw) {
    throw new Error('Empty vision response')
  }

  const parsed = JSON.parse(raw) as {
    category?: string
    summary?: string
    extracted_text?: string
  }

  const extractedText = (parsed.extracted_text || '').trim()
  const evidenceType = resolveCategory(
    parsed.category,
    file,
    extractedText,
    allowed
  )

  const summary =
    parsed.summary?.trim() ||
    summarizeFile(file, extractedText, evidenceType)

  return {
    evidenceType,
    summary,
    extractedText,
  }
}

export async function analyzeEvidence(
  file: File,
  extractedText: string,
  allowedCategoryLabels?: string[]
): Promise<EvidenceAnalysis> {
  const allowed =
    allowedCategoryLabels?.length
      ? allowedCategoryLabels
      : categoryLabels(defaultFileCategories())

  const text = extractedText.trim()
  const fallbackType = resolveCategory(undefined, file, text, allowed)
  const fallbackSummary = summarizeFile(file, extractedText, fallbackType)

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    return { evidenceType: fallbackType, summary: fallbackSummary }
  }

  if (isImageFile(file) && text.length < MIN_TEXT_FOR_TEXT_ONLY) {
    try {
      const vision = await analyzeImageWithVision(file, allowed)
      return {
        evidenceType: vision.evidenceType,
        summary: `${vision.evidenceType}: ${file.name} — ${vision.summary}`,
        extractedText: vision.extractedText || undefined,
      }
    } catch (err) {
      console.error('Vision evidence analysis failed:', err)
    }
  }

  try {
    const { default: Groq } = await import('groq-sdk')
    const groq = new Groq({ apiKey })
    const rules = buildCategoryRules(allowed)

    const completion = await groq.chat.completions.create({
      model: GROQ_TEXT_MODEL,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You analyze contractor project job files.

Return JSON only:
{
  "category": "<exact name from allowed list>",
  "summary": "<1-2 factual sentences using ONLY provided information>"
}

${rules}`,
        },
        {
          role: 'user',
          content: `File name: ${file.name}
MIME type: ${file.type || 'unknown'}

Content:
${text || '(No text extracted — use filename and type.)'}`,
        },
      ],
    })

    const raw = completion.choices?.[0]?.message?.content?.trim()
    if (!raw) {
      return { evidenceType: fallbackType, summary: fallbackSummary }
    }

    const parsed = JSON.parse(raw) as {
      category?: string
      summary?: string
    }

    const evidenceType = resolveCategory(
      parsed.category,
      file,
      text,
      allowed
    )

    const summary =
      parsed.summary?.trim() ||
      summarizeFile(file, extractedText, evidenceType)

    return {
      evidenceType,
      summary: `${evidenceType}: ${file.name} — ${summary}`,
    }
  } catch (err) {
    console.error('Evidence analysis failed:', err)
    return { evidenceType: fallbackType, summary: fallbackSummary }
  }
}

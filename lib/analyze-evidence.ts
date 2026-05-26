import 'server-only'
import {
  EVIDENCE_TYPES,
  type EvidenceType,
  guessEvidenceTypeFromExtractedText,
  guessEvidenceTypeFromFile,
  normalizeEvidenceType,
} from '@/lib/evidence-types'
import { GROQ_TEXT_MODEL, GROQ_VISION_MODEL } from '@/lib/groq-models'
import { summarizeFile } from '@/lib/summarize-text'

export type EvidenceAnalysis = {
  evidenceType: EvidenceType
  summary: string
  /** Set when vision analysis extracts text that OCR missed. */
  extractedText?: string
}

const MIN_TEXT_FOR_TEXT_ONLY = 80

const CATEGORY_RULES = `Category rules:
- Damage Photo: photos of physical property damage, mold, water/fire damage, or the job site (not document screenshots)
- Invoice: bills, receipts, paid invoices
- Estimate: repair estimates, scopes, quotes, Xactimate
- Moisture Reading: moisture logs, hygrometer readings, drying charts
- Insurance Email: insurer/adjuster emails or letters
- Report: claim summaries, policy/claim forms, inspection reports, PDF/PNG screenshots of documents, Copilot exports
- Other: does not fit above

Important: PNG/JPEG screenshots of claim forms, policies, or insurance paperwork are Report or Insurance Email — NOT Damage Photo just because the file is an image.`

function isImageFile(file: File): boolean {
  return (
    file.type.startsWith('image/') ||
    /\.(jpe?g|png|gif|webp|heic|bmp)$/i.test(file.name)
  )
}

async function analyzeImageWithVision(file: File): Promise<{
  evidenceType: EvidenceType
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
        content: `You analyze restoration/insurance project document images.

Return JSON only:
{
  "category": "<one of: ${EVIDENCE_TYPES.join(', ')}>",
  "summary": "<1-2 factual sentences about what this image shows>",
  "extracted_text": "<all readable text in the image, or empty string if none>"
}

${CATEGORY_RULES}

Never invent report details not visible in the image.`,
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

  const fallbackType = guessEvidenceTypeFromFile(file)
  const evidenceType = normalizeEvidenceType(parsed.category || fallbackType)
  const extractedText = (parsed.extracted_text || '').trim()
  const textHint = guessEvidenceTypeFromExtractedText(extractedText)
  const finalType = textHint || evidenceType

  const summary =
    parsed.summary?.trim() ||
    summarizeFile(file, extractedText, finalType)

  return {
    evidenceType: finalType,
    summary,
    extractedText,
  }
}

export async function analyzeEvidence(
  file: File,
  extractedText: string
): Promise<EvidenceAnalysis> {
  const text = extractedText.trim()
  const textHint = guessEvidenceTypeFromExtractedText(text)
  const fallbackType = textHint || guessEvidenceTypeFromFile(file)
  const fallbackSummary = summarizeFile(file, extractedText, fallbackType)

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    return { evidenceType: fallbackType, summary: fallbackSummary }
  }

  if (isImageFile(file) && text.length < MIN_TEXT_FOR_TEXT_ONLY) {
    try {
      const vision = await analyzeImageWithVision(file)
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

    const completion = await groq.chat.completions.create({
      model: GROQ_TEXT_MODEL,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You analyze restoration/insurance project document files.

Return JSON only:
{
  "category": "<one of: ${EVIDENCE_TYPES.join(', ')}>",
  "summary": "<1-2 factual sentences about the file using ONLY provided information>"
}

${CATEGORY_RULES}

Never invent facts not in the file content or filename.`,
        },
        {
          role: 'user',
          content: `File name: ${file.name}
MIME type: ${file.type || 'unknown'}

Content:
${text || '(No text could be extracted — classify from filename and file type.)'}`,
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

    let evidenceType = normalizeEvidenceType(parsed.category || fallbackType)
    if (textHint) evidenceType = textHint

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

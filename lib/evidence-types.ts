export const SIGNED_DOCUMENTS_TYPE = 'Signed documents' as const

export const EVIDENCE_TYPES = [
  'Site Photo',
  'Invoice',
  'Estimate',
  'Measurements',
  'Correspondence',
  'Documents',
  SIGNED_DOCUMENTS_TYPE,
  'Other',
] as const

export type EvidenceType = (typeof EVIDENCE_TYPES)[number]

/** Previous default labels (and common variants) → current defaults. */
export const LEGACY_EVIDENCE_TYPE_LABELS: Record<string, EvidenceType> = {
  'damage photo': 'Site Photo',
  'moisture reading': 'Measurements',
  'insurance email': 'Correspondence',
  report: 'Documents',
}

export function normalizeEvidenceType(raw: string): EvidenceType {
  const cleaned = raw.trim().toLowerCase()

  const legacy = LEGACY_EVIDENCE_TYPE_LABELS[cleaned]
  if (legacy) return legacy

  const match = EVIDENCE_TYPES.find((t) => t.toLowerCase() === cleaned)
  if (match) return match

  if (cleaned.includes('invoice') || cleaned.includes('receipt')) return 'Invoice'
  if (cleaned.includes('estimate') || cleaned.includes('quote')) return 'Estimate'
  if (
    cleaned.includes('moisture') ||
    cleaned.includes('reading') ||
    cleaned.includes('measurement')
  ) {
    return 'Measurements'
  }
  if (cleaned.includes('email') || cleaned.includes('letter')) {
    return 'Correspondence'
  }
  if (cleaned.includes('signed')) return SIGNED_DOCUMENTS_TYPE
  if (
    cleaned.includes('report') ||
    cleaned.includes('document') ||
    cleaned.includes('contract') ||
    cleaned.includes('form')
  ) {
    return 'Documents'
  }
  if (
    cleaned.includes('photo') ||
    cleaned.includes('image') ||
    cleaned.includes('site')
  ) {
    return 'Site Photo'
  }

  return 'Other'
}

export function guessEvidenceTypeFromFile(file: {
  name: string
  type: string
}): EvidenceType {
  const name = file.name.toLowerCase()
  const mime = file.type.toLowerCase()

  if (name.startsWith('signed-')) {
    return SIGNED_DOCUMENTS_TYPE
  }

  if (name.includes('invoice') || name.includes('receipt') || name.includes('bill')) {
    return 'Invoice'
  }
  if (name.includes('estimate') || name.includes('quote') || name.includes('proposal')) {
    return 'Estimate'
  }
  if (
    name.includes('moisture') ||
    name.includes('hygro') ||
    name.includes('drying') ||
    name.includes('reading')
  ) {
    return 'Measurements'
  }
  if (
    name.includes('email') ||
    name.includes('correspondence') ||
    name.includes('letter')
  ) {
    return 'Correspondence'
  }
  if (
    name.includes('report') ||
    name.includes('contract') ||
    name.includes('scope') ||
    name.includes('spec')
  ) {
    return 'Documents'
  }
  if (mime === 'application/pdf' || name.endsWith('.docx')) return 'Documents'

  if (mime.startsWith('image/')) {
    return 'Site Photo'
  }

  return 'Other'
}

/** Prefer Documents/Correspondence when OCR text looks like a document, not a job-site photo. */
export function guessEvidenceTypeFromExtractedText(text: string): EvidenceType | null {
  const sample = text.slice(0, 4000).toLowerCase()
  if (sample.length < 40) return null

  const docSignals = [
    'invoice',
    'estimate',
    'quote',
    'proposal',
    'contract',
    'work order',
    'scope of work',
    'dear ',
    'attention:',
    'total due',
    'amount due',
    'payment terms',
  ]
  const photoSignals = [
    'job site',
    'before',
    'after',
    'installed',
    'ceiling',
    'drywall',
    'flooring',
    'foundation',
  ]

  const docHits = docSignals.filter((s) => sample.includes(s)).length
  const photoHits = photoSignals.filter((s) => sample.includes(s)).length

  if (docHits >= 2 && docHits >= photoHits) {
    if (sample.includes('invoice') || sample.includes('receipt')) return 'Invoice'
    if (sample.includes('estimate') || sample.includes('quote')) return 'Estimate'
    if (sample.includes('email') || sample.includes('dear ')) return 'Correspondence'
    return 'Documents'
  }

  return null
}

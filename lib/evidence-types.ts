export const EVIDENCE_TYPES = [
  'Damage Photo',
  'Invoice',
  'Estimate',
  'Moisture Reading',
  'Insurance Email',
  'Report',
  'Other',
] as const

export type EvidenceType = (typeof EVIDENCE_TYPES)[number]

export function normalizeEvidenceType(raw: string): EvidenceType {
  const cleaned = raw.trim().toLowerCase()

  const match = EVIDENCE_TYPES.find((t) => t.toLowerCase() === cleaned)
  if (match) return match

  if (cleaned.includes('invoice') || cleaned.includes('receipt')) return 'Invoice'
  if (cleaned.includes('estimate') || cleaned.includes('quote')) return 'Estimate'
  if (cleaned.includes('moisture')) return 'Moisture Reading'
  if (cleaned.includes('email') || cleaned.includes('letter')) return 'Insurance Email'
  if (
    cleaned.includes('report') ||
    cleaned.includes('claim') ||
    cleaned.includes('policy') ||
    cleaned.includes('insurance')
  ) {
    return 'Report'
  }
  if (
    cleaned.includes('damage') &&
    (cleaned.includes('photo') || cleaned.includes('image'))
  ) {
    return 'Damage Photo'
  }

  return 'Other'
}

export function guessEvidenceTypeFromFile(file: {
  name: string
  type: string
}): EvidenceType {
  const name = file.name.toLowerCase()
  const mime = file.type.toLowerCase()

  if (name.includes('invoice') || name.includes('receipt') || name.includes('bill')) {
    return 'Invoice'
  }
  if (name.includes('estimate') || name.includes('quote') || name.includes('xact')) {
    return 'Estimate'
  }
  if (name.includes('moisture') || name.includes('hygro') || name.includes('drying')) {
    return 'Moisture Reading'
  }
  if (name.includes('email') || name.includes('correspondence') || name.includes('adjuster')) {
    return 'Insurance Email'
  }
  if (
    name.includes('report') ||
    name.includes('copilot') ||
    name.includes('inspection') ||
    name.includes('claim') ||
    name.includes('insurance')
  ) {
    return 'Report'
  }
  if (mime === 'application/pdf' || name.endsWith('.docx')) return 'Report'

  if (mime.startsWith('image/')) {
    return 'Other'
  }

  return 'Other'
}

/** Prefer Report/Email when OCR text looks like a document, not a job-site photo. */
export function guessEvidenceTypeFromExtractedText(text: string): EvidenceType | null {
  const sample = text.slice(0, 4000).toLowerCase()
  if (sample.length < 40) return null

  const docSignals = [
    'claim number',
    'policy number',
    'insured',
    'insurance',
    'adjuster',
    'deductible',
    'coverage',
    'loss date',
    'date of loss',
    'declaration',
    'estimate',
    'invoice',
    'xactimate',
  ]
  const photoSignals = ['mold', 'water damage', 'ceiling', 'drywall', 'flooring']

  const docHits = docSignals.filter((s) => sample.includes(s)).length
  const photoHits = photoSignals.filter((s) => sample.includes(s)).length

  if (docHits >= 2 && docHits >= photoHits) {
    if (sample.includes('invoice') || sample.includes('receipt')) return 'Invoice'
    if (sample.includes('estimate') || sample.includes('xactimate')) return 'Estimate'
    if (sample.includes('email') || sample.includes('dear ')) return 'Insurance Email'
    return 'Report'
  }

  return null
}

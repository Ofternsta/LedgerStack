import type { SupabaseClient } from '@supabase/supabase-js'
import {
  EVIDENCE_TYPES,
  LEGACY_EVIDENCE_TYPE_LABELS,
  normalizeEvidenceType,
  SIGNED_DOCUMENTS_TYPE,
} from '@/lib/evidence-types'

export const SIGNED_DOCUMENTS_CATEGORY_LABEL = SIGNED_DOCUMENTS_TYPE

/** Keys from the previous default category set → current default label. */
const LEGACY_FILE_CATEGORY_KEYS: Record<string, string> = {
  damage_photo: 'Site Photo',
  moisture_reading: 'Measurements',
  insurance_email: 'Correspondence',
  report: 'Documents',
}

export const MAX_FILE_CATEGORIES = 15
export const MIN_FILE_CATEGORIES = 1

export type FileCategory = {
  key: string
  label: string
}

export function defaultFileCategories(): FileCategory[] {
  const keys = new Set<string>()
  return EVIDENCE_TYPES.map((label) => ({
    key: slugifyFileCategoryKey(label, keys),
    label,
  }))
}

export function slugifyFileCategoryKey(label: string, existing: Set<string>): string {
  let base =
    label
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 40) || 'category'

  let key = base
  let n = 2
  while (existing.has(key)) {
    key = `${base}_${n}`
    n += 1
  }
  existing.add(key)
  return key
}

export function parseProjectFileCategories(raw: unknown): FileCategory[] {
  if (!raw || typeof raw !== 'object') {
    return defaultFileCategories()
  }

  const stagesRaw = (raw as { categories?: unknown }).categories
  if (!Array.isArray(stagesRaw) || stagesRaw.length < MIN_FILE_CATEGORIES) {
    return defaultFileCategories()
  }

  const categories: FileCategory[] = []
  const seen = new Set<string>()

  for (const item of stagesRaw) {
    if (!item || typeof item !== 'object') continue
    const key = String((item as FileCategory).key || '').trim()
    const label = String((item as FileCategory).label || '').trim().slice(0, 48)
    if (!key || !label || seen.has(key)) continue
    seen.add(key)
    categories.push({ key, label })
  }

  if (categories.length < MIN_FILE_CATEGORIES) {
    return defaultFileCategories()
  }

  return ensureSignedDocumentsInCategories(
    categories.slice(0, MAX_FILE_CATEGORIES)
  )
}

/** Adds Signed documents when missing (does not write to DB). */
export function ensureSignedDocumentsInCategories(
  categories: FileCategory[]
): FileCategory[] {
  if (hasSignedDocumentsCategory(categories)) {
    return categories
  }

  const keys = new Set(categories.map((c) => c.key))
  return [
    ...categories,
    {
      key: slugifyFileCategoryKey(SIGNED_DOCUMENTS_CATEGORY_LABEL, keys),
      label: SIGNED_DOCUMENTS_CATEGORY_LABEL,
    },
  ].slice(0, MAX_FILE_CATEGORIES)
}

export function serializeProjectFileCategories(
  categories: FileCategory[]
): { categories: FileCategory[] } {
  return { categories: categories.map((c) => ({ key: c.key, label: c.label })) }
}

export function validateFileCategories(
  categories: FileCategory[]
): { ok: true } | { ok: false; error: string } {
  if (categories.length < MIN_FILE_CATEGORIES) {
    return {
      ok: false,
      error: `At least ${MIN_FILE_CATEGORIES} category is required.`,
    }
  }
  if (categories.length > MAX_FILE_CATEGORIES) {
    return {
      ok: false,
      error: `At most ${MAX_FILE_CATEGORIES} categories are allowed.`,
    }
  }

  const keys = new Set<string>()
  for (const cat of categories) {
    if (!cat.label.trim()) {
      return { ok: false, error: 'Every category needs a name.' }
    }
    if (!cat.key.trim() || keys.has(cat.key)) {
      return { ok: false, error: 'Duplicate category keys.' }
    }
    keys.add(cat.key)
  }

  return { ok: true }
}

export function normalizeFileCategoryLabel(
  raw: string | null | undefined,
  categories: FileCategory[]
): string {
  const trimmed = raw?.trim()
  if (!trimmed) return categories[0]?.label ?? 'Other'

  const byLabel = categories.find(
    (c) => c.label.toLowerCase() === trimmed.toLowerCase()
  )
  if (byLabel) return byLabel.label

  const byKey = categories.find((c) => c.key === trimmed)
  if (byKey) return byKey.label

  const legacyMapped =
    LEGACY_EVIDENCE_TYPE_LABELS[trimmed.toLowerCase()] ??
    LEGACY_FILE_CATEGORY_KEYS[trimmed] ??
    LEGACY_FILE_CATEGORY_KEYS[trimmed.toLowerCase()]

  if (legacyMapped) {
    const inWorkflow = categories.find(
      (c) => c.label.toLowerCase() === legacyMapped.toLowerCase()
    )
    if (inWorkflow) return inWorkflow.label
  }

  if (trimmed.toLowerCase() === SIGNED_DOCUMENTS_CATEGORY_LABEL.toLowerCase()) {
    const signed = categories.find(
      (c) => c.label.toLowerCase() === SIGNED_DOCUMENTS_CATEGORY_LABEL.toLowerCase()
    )
    return signed?.label ?? SIGNED_DOCUMENTS_CATEGORY_LABEL
  }

  const normalized = normalizeEvidenceType(trimmed)
  if (normalized === SIGNED_DOCUMENTS_TYPE) {
    const signed = categories.find(
      (c) => c.label.toLowerCase() === SIGNED_DOCUMENTS_CATEGORY_LABEL.toLowerCase()
    )
    return signed?.label ?? SIGNED_DOCUMENTS_CATEGORY_LABEL
  }

  const fromDefault = categories.find(
    (c) => c.label.toLowerCase() === normalized.toLowerCase()
  )
  if (fromDefault) return fromDefault.label

  const other = categories.find((c) => c.label.toLowerCase() === 'other')
  return other?.label ?? categories[categories.length - 1]?.label ?? trimmed
}

export function categoryLabels(categories: FileCategory[]): string[] {
  return categories.map((c) => c.label)
}

export function hasSignedDocumentsCategory(categories: FileCategory[]): boolean {
  return categories.some(
    (c) => c.label.toLowerCase() === SIGNED_DOCUMENTS_CATEGORY_LABEL.toLowerCase()
  )
}

/** Ensures every project has a Signed documents folder (e.g. after first e-sign). */
export async function ensureSignedDocumentsCategoryOnProject(
  supabase: SupabaseClient,
  projectId: string
): Promise<FileCategory[]> {
  const { data: project } = await supabase
    .from('projects')
    .select('file_categories')
    .eq('id', projectId)
    .maybeSingle()

  const categories = parseProjectFileCategories(project?.file_categories)
  if (hasSignedDocumentsCategory(categories)) {
    return categories
  }

  const updated = ensureSignedDocumentsInCategories(categories)

  await supabase
    .from('projects')
    .update({ file_categories: serializeProjectFileCategories(updated) })
    .eq('id', projectId)

  return updated
}

export function normalizeFileCategoriesDraft(
  draft: FileCategory[]
): FileCategory[] {
  const keys = new Set<string>()
  const normalized: FileCategory[] = []

  for (const cat of draft) {
    const label = cat.label.trim().slice(0, 48)
    if (!label) continue
    let key = cat.key.trim()
    if (!key || keys.has(key)) {
      key = slugifyFileCategoryKey(label, keys)
    } else {
      keys.add(key)
    }
    normalized.push({ key, label })
  }

  if (normalized.length < MIN_FILE_CATEGORIES) {
    return defaultFileCategories()
  }

  return normalized.slice(0, MAX_FILE_CATEGORIES)
}

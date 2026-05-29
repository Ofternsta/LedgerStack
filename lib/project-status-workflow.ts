/** Per-project report status workflow (variable stages; last stage is always completed). */

export const COMPLETED_STATUS_KEY = 'completed'

export const MAX_STATUS_STAGES = 20
export const MIN_STATUS_STAGES = 2

export type StatusStage = {
  key: string
  label: string
}

export const DEFAULT_STATUS_WORKFLOW: StatusStage[] = [
  { key: 'inspection', label: 'Inspection' },
  { key: 'documentation', label: 'Documentation' },
  { key: 'estimate_sent', label: 'Estimate Sent' },
  { key: 'approved', label: 'Approved' },
  { key: 'in_progress', label: 'In Progress' },
  { key: COMPLETED_STATUS_KEY, label: 'Completed' },
]

/** Legacy DB values (fixed six labels) → stable keys */
const LEGACY_LABEL_TO_KEY: Record<string, string> = {
  inspection: 'inspection',
  documentation: 'documentation',
  'estimate sent': 'estimate_sent',
  'estimate_sent': 'estimate_sent',
  approved: 'approved',
  'in progress': 'in_progress',
  in_progress: 'in_progress',
  completed: COMPLETED_STATUS_KEY,
  Inspection: 'inspection',
  Documentation: 'documentation',
  'Estimate Sent': 'estimate_sent',
  Approved: 'approved',
  'In Progress': 'in_progress',
  Completed: COMPLETED_STATUS_KEY,
}

export function slugifyStatusKey(label: string, existing: Set<string>): string {
  let base =
    label
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 40) || 'stage'

  if (base === COMPLETED_STATUS_KEY) base = 'completed_stage'

  let key = base
  let n = 2
  while (existing.has(key)) {
    key = `${base}_${n}`
    n += 1
  }
  existing.add(key)
  return key
}

export function parseProjectStatusWorkflow(raw: unknown): StatusStage[] {
  if (!raw || typeof raw !== 'object') {
    return DEFAULT_STATUS_WORKFLOW.map((s) => ({ ...s }))
  }

  const stagesRaw = (raw as { stages?: unknown }).stages
  if (!Array.isArray(stagesRaw) || stagesRaw.length < MIN_STATUS_STAGES) {
    return DEFAULT_STATUS_WORKFLOW.map((s) => ({ ...s }))
  }

  const stages: StatusStage[] = []
  const seen = new Set<string>()

  for (const item of stagesRaw) {
    if (!item || typeof item !== 'object') continue
    const key = String((item as StatusStage).key || '').trim()
    const label = String((item as StatusStage).label || '').trim().slice(0, 48)
    if (!key || !label || seen.has(key)) continue
    seen.add(key)
    stages.push({ key, label })
  }

  if (stages.length < MIN_STATUS_STAGES) {
    return DEFAULT_STATUS_WORKFLOW.map((s) => ({ ...s }))
  }

  const last = stages[stages.length - 1]
  if (last.key !== COMPLETED_STATUS_KEY) {
    const withoutCompleted = stages.filter((s) => s.key !== COMPLETED_STATUS_KEY)
    const completedLabel =
      stages.find((s) => s.key === COMPLETED_STATUS_KEY)?.label || 'Completed'
    return [
      ...withoutCompleted,
      { key: COMPLETED_STATUS_KEY, label: completedLabel.slice(0, 48) },
    ]
  }

  return stages.slice(0, MAX_STATUS_STAGES)
}

export function serializeProjectStatusWorkflow(
  stages: StatusStage[]
): { stages: StatusStage[] } {
  return { stages: stages.map((s) => ({ key: s.key, label: s.label })) }
}

export function validateStatusWorkflow(
  stages: StatusStage[]
): { ok: true } | { ok: false; error: string } {
  if (stages.length < MIN_STATUS_STAGES) {
    return { ok: false, error: `At least ${MIN_STATUS_STAGES} stages are required.` }
  }
  if (stages.length > MAX_STATUS_STAGES) {
    return {
      ok: false,
      error: `At most ${MAX_STATUS_STAGES} stages are allowed.`,
    }
  }

  const keys = new Set<string>()
  for (const stage of stages) {
    if (!stage.label.trim()) {
      return { ok: false, error: 'Every stage needs a label.' }
    }
    if (!stage.key.trim()) {
      return { ok: false, error: 'Every stage needs a key.' }
    }
    if (keys.has(stage.key)) {
      return { ok: false, error: 'Duplicate stage keys.' }
    }
    keys.add(stage.key)
  }

  if (stages[stages.length - 1].key !== COMPLETED_STATUS_KEY) {
    return {
      ok: false,
      error: 'The last stage must be Completed (fixed final stage).',
    }
  }

  return { ok: true }
}

export function normalizeStatusKey(
  raw: string | null | undefined,
  workflow: StatusStage[]
): string {
  const trimmed = raw?.trim()
  if (!trimmed) return workflow[0]?.key ?? 'inspection'

  const byKey = workflow.find((s) => s.key === trimmed)
  if (byKey) return byKey.key

  const legacy = LEGACY_LABEL_TO_KEY[trimmed] ?? LEGACY_LABEL_TO_KEY[trimmed.toLowerCase()]
  if (legacy) {
    const inWorkflow = workflow.find((s) => s.key === legacy)
    if (inWorkflow) return legacy
  }

  const byLabel = workflow.find(
    (s) => s.label.toLowerCase() === trimmed.toLowerCase()
  )
  if (byLabel) return byLabel.key

  return workflow[0]?.key ?? trimmed
}

export function statusIndex(key: string, workflow: StatusStage[]): number {
  const k = normalizeStatusKey(key, workflow)
  const idx = workflow.findIndex((s) => s.key === k)
  return idx >= 0 ? idx : 0
}

export function isStatusInWorkflow(key: string, workflow: StatusStage[]): boolean {
  const k = normalizeStatusKey(key, workflow)
  return workflow.some((s) => s.key === k)
}

export function isCompletedStatus(
  key: string,
  workflow: StatusStage[]
): boolean {
  return normalizeStatusKey(key, workflow) === COMPLETED_STATUS_KEY
}

export function statusLabel(
  key: string,
  workflow: StatusStage[]
): string {
  const k = normalizeStatusKey(key, workflow)
  return workflow.find((s) => s.key === k)?.label ?? key
}

export function defaultFirstStatusKey(workflow: StatusStage[]): string {
  return workflow[0]?.key ?? 'inspection'
}

/** Normalize editor payload: ensure completed last, unique keys, valid labels */
export function normalizeWorkflowDraft(
  draft: StatusStage[]
): StatusStage[] {
  const nonCompleted = draft.filter((s) => s.key !== COMPLETED_STATUS_KEY)
  const completed =
    draft.find((s) => s.key === COMPLETED_STATUS_KEY) ??
    ({ key: COMPLETED_STATUS_KEY, label: 'Completed' } satisfies StatusStage)

  const keys = new Set<string>()
  const normalized: StatusStage[] = []

  for (const stage of nonCompleted) {
    const label = stage.label.trim().slice(0, 48)
    if (!label) continue
    let key = stage.key.trim()
    if (!key || key === COMPLETED_STATUS_KEY || keys.has(key)) {
      key = slugifyStatusKey(label, keys)
    } else {
      keys.add(key)
    }
    normalized.push({ key, label })
  }

  const completedLabel = completed.label.trim().slice(0, 48) || 'Completed'
  normalized.push({ key: COMPLETED_STATUS_KEY, label: completedLabel })

  if (normalized.length < MIN_STATUS_STAGES) {
    return DEFAULT_STATUS_WORKFLOW.map((s) => ({ ...s }))
  }

  return normalized.slice(0, MAX_STATUS_STAGES)
}

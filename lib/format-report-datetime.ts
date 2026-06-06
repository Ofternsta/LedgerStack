/** Format ISO timestamps for AI reports using the viewer's local timezone when provided. */
export function formatReportWhen(
  iso: string | null | undefined,
  timeZone?: string
): string {
  if (!iso) return '—'
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return iso
  return new Date(t).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
    ...(timeZone ? { timeZone } : {}),
  })
}

/** Elapsed time since project start as "5d 12h" (whole days and hours). */
export function formatProjectActiveDuration(
  createdAt: string | null | undefined,
  nowMs: number = Date.now()
): string | null {
  if (!createdAt) return null
  const startMs = new Date(createdAt).getTime()
  if (!Number.isFinite(startMs)) return null

  const elapsedMs = Math.max(0, nowMs - startMs)
  const totalHours = Math.floor(elapsedMs / (1000 * 60 * 60))
  const days = Math.floor(totalHours / 24)
  const hours = totalHours % 24

  return `${days}d ${hours}h`
}

/** Sanitize a user-visible file name (storage path is unchanged). */
export function sanitizeEvidenceDisplayName(raw: string): string {
  const trimmed = raw.trim().replace(/[/\\]+/g, '-').slice(0, 200)
  return trimmed || 'document'
}

/** Update which category folder a document belongs to (org admin). */
export async function moveEvidenceCategory(
  filePath: string,
  evidenceType: string
): Promise<void> {
  const res = await fetch('/api/evidence', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ file_path: filePath, evidence_type: evidenceType }),
  })
  const payload = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(
      (payload as { error?: string }).error || 'Could not move document'
    )
  }
}

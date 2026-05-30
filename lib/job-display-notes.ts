/** Notes shown on the job list (claim notes, else project creation notes). */
export function displayJobCreationNotes(
  claimNotes: string | null | undefined,
  projectNotes: string | null | undefined
): string | null {
  const claim = claimNotes?.trim()
  if (claim && claim.toLowerCase() !== 'auto claim') return claim

  const project = projectNotes?.trim()
  return project || null
}

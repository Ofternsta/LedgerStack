/** Display label for a client on project access lists. */
export function clientAccessDisplayName(
  hasAccount: boolean,
  fullName: string | null | undefined
): string {
  if (!hasAccount) return 'No account created'
  const trimmed = fullName?.trim()
  return trimmed || 'Client'
}

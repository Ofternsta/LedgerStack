/** Comma-separated in PLATFORM_OWNER_EMAIL — only these users can delete accounts */

export function getPlatformOwnerEmails(): string[] {
  return (process.env.PLATFORM_OWNER_EMAIL || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
}

export function isPlatformOwner(email: string | undefined | null): boolean {
  if (!email) return false
  const owners = getPlatformOwnerEmails()
  if (!owners.length) return false
  return owners.includes(email.trim().toLowerCase())
}

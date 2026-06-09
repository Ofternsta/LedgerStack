export const ORG_NAME_MAX_LENGTH = 80

/** Normalize and validate organization display name for storage. */
export function sanitizeOrganizationName(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const name = raw.trim().replace(/\s+/g, ' ')
  if (!name || name.length > ORG_NAME_MAX_LENGTH) return null
  return name
}

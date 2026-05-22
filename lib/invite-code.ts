/** Procedural company invite codes — workers must use an admin-issued code */

export const INVITE_CODE_LENGTH = 8

const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

/** Matches codes produced by generateInviteCode() */
export const INVITE_CODE_PATTERN = /^[A-HJ-NP-Z2-9]{8}$/

export function normalizeInviteCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, INVITE_CODE_LENGTH)
}

export function isProceduralInviteFormat(code: string): boolean {
  return INVITE_CODE_PATTERN.test(normalizeInviteCode(code))
}

/** Short code workers enter to request joining an organization */
export function generateInviteCode(): string {
  let code = ''
  for (let i = 0; i < INVITE_CODE_LENGTH; i++) {
    code += CHARSET[Math.floor(Math.random() * CHARSET.length)]
  }
  return code
}

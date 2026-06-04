import 'server-only'

export function signwellApiKey(): string | null {
  const key = process.env.SIGNWELL_API_KEY?.trim()
  return key || null
}

export function signwellTestMode(): boolean {
  const raw = process.env.SIGNWELL_TEST_MODE?.trim().toLowerCase()
  if (raw === 'false' || raw === '0') return false
  if (raw === 'true' || raw === '1') return true
  return process.env.NODE_ENV !== 'production'
}

export function signwellWebhookId(): string | null {
  return process.env.SIGNWELL_WEBHOOK_ID?.trim() || null
}

export const SIGNWELL_API_BASE = 'https://www.signwell.com/api/v1'

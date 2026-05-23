export type AdminSignupDraft = {
  email: string
  password: string
  fullName: string
  organizationName: string
}

const STORAGE_KEY = 'ledgerstack_admin_signup_draft'

export function saveAdminSignupDraft(draft: AdminSignupDraft) {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft))
}

export function loadAdminSignupDraft(): AdminSignupDraft | null {
  if (typeof window === 'undefined') return null
  const raw = sessionStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as AdminSignupDraft
    if (!parsed.email || !parsed.password) return null
    return parsed
  } catch {
    return null
  }
}

export function clearAdminSignupDraft() {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(STORAGE_KEY)
}

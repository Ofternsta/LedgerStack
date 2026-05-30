import 'server-only'

import type { EmailOtpType, SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

export function safeAuthNextPath(next: string | null) {
  if (!next || !next.startsWith('/') || next.startsWith('//')) {
    return '/projects'
  }
  return next
}

export function isSignupVerifyReturn(path: string) {
  return (
    path.startsWith('/onboarding/email-verified') ||
    (path.startsWith('/checkout') && path.includes('register=1'))
  )
}

export function appendEmailToPath(path: string, email: string, origin: string) {
  const url = new URL(path, origin)
  if (!url.searchParams.has('email')) {
    url.searchParams.set('email', email)
  }
  return `${url.pathname}${url.search}`
}

function mapOtpType(type: string): EmailOtpType | null {
  const normalized = type.toLowerCase()
  if (
    normalized === 'signup' ||
    normalized === 'email' ||
    normalized === 'recovery' ||
    normalized === 'invite' ||
    normalized === 'magiclink' ||
    normalized === 'email_change'
  ) {
    return normalized as EmailOtpType
  }
  return null
}

export type ConfirmEmailResult =
  | { ok: true; destination: string }
  | { ok: false; error: string; loginQuery: string }

/** Verify email from link (token_hash or PKCE code) and return redirect path. */
export async function confirmEmailFromLink(
  origin: string,
  params: {
    next: string | null
    token_hash?: string | null
    type?: string | null
    code?: string | null
    supabase?: SupabaseClient
  }
): Promise<ConfirmEmailResult> {
  const next = safeAuthNextPath(params.next)
  const supabase = params.supabase ?? (await createClient())

  if (params.token_hash && params.type) {
    const otpType = mapOtpType(params.type)
    if (!otpType) {
      return {
        ok: false,
        error: 'Invalid verification link type.',
        loginQuery: 'signup=admin&verify_error=invalid_link',
      }
    }

    const { error } = await supabase.auth.verifyOtp({
      token_hash: params.token_hash,
      type: otpType,
    })

    if (error) {
      return {
        ok: false,
        error: error.message,
        loginQuery: `signup=admin&verify_error=${encodeURIComponent(error.message)}`,
      }
    }
  } else if (params.code) {
    const { error } = await supabase.auth.exchangeCodeForSession(params.code)
    if (error) {
      return {
        ok: false,
        error: error.message,
        loginQuery: `signup=admin&verify_error=${encodeURIComponent(error.message)}`,
      }
    }
  } else {
    return {
      ok: false,
      error: 'missing_token',
      loginQuery: 'signup=admin',
    }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      ok: false,
      error: 'Session could not be established after verification.',
      loginQuery: 'signup=admin&verify_error=session_failed',
    }
  }

  if (!user.email_confirmed_at && !isSignupVerifyReturn(next)) {
    return {
      ok: false,
      error: 'Email is not confirmed yet.',
      loginQuery: `verify=1&email=${encodeURIComponent(user.email || '')}`,
    }
  }

  let destination = next
  if (user.email && isSignupVerifyReturn(next)) {
    destination = appendEmailToPath(next, user.email, origin)
  }

  return { ok: true, destination }
}

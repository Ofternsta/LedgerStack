import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'
import {
  confirmEmailFromLink,
  isSignupVerifyReturn,
  safeAuthNextPath,
} from '@/lib/auth-confirm-server'
import { billingAppUrl } from '@/lib/stripe-config'

function clientFallbackUrl(origin: string, next: string) {
  const fallback = new URL('/auth/confirm/client', origin)
  fallback.searchParams.set('next', next)
  return fallback
}

/** Completes email verification from Supabase links (token_hash or PKCE code). */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const origin = billingAppUrl()
  const next = safeAuthNextPath(searchParams.get('next'))
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const code = searchParams.get('code')

  if (!token_hash && !code) {
    return NextResponse.redirect(clientFallbackUrl(origin, next))
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  const result = await confirmEmailFromLink(origin, {
    next,
    token_hash,
    type,
    code,
    supabase,
  })

  if (!result.ok) {
    if (result.error === 'missing_token') {
      return NextResponse.redirect(clientFallbackUrl(origin, next))
    }
    if (isSignupVerifyReturn(next)) {
      const signupReturn = new URL(next, origin)
      signupReturn.searchParams.set('verify_error', result.error)
      return NextResponse.redirect(signupReturn)
    }
    return NextResponse.redirect(`${origin}/login?${result.loginQuery}`)
  }

  return NextResponse.redirect(`${origin}${result.destination}`)
}

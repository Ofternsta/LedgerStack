import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { adminNeedsSubscription } from '@/lib/admin-subscription-status'
import {
  isPublicLegalPath,
  isPublicSeoPath,
  isPublicSignupCheckoutPath,
  isSignupRegisterCheckoutRequest,
} from '@/lib/auth-public-routes'
import { needsMfaVerificationServer } from '@/lib/mfa-auth-server'

/** Skip Supabase round-trip when the browser has no session cookies. */
function hasSupabaseSessionCookies(request: NextRequest): boolean {
  return request.cookies.getAll().some(
    (c) => c.name.startsWith('sb-') && c.name.includes('auth')
  )
}

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const isAuthRoute =
    pathname.startsWith('/login') || pathname.startsWith('/auth')
  const isPublicApi =
    pathname.startsWith('/api/billing/webhook') ||
    pathname.startsWith('/api/auth/register-admin') ||
    pathname.startsWith('/api/auth/email-verification-status') ||
    pathname.startsWith('/api/auth/resend-verification') ||
    pathname.startsWith('/api/auth/trial-eligibility') ||
    pathname.startsWith('/api/auth/finish-signup')
  const isPublicOnboarding = pathname.startsWith('/onboarding/')
  const isPublicSignupCheckout = isPublicSignupCheckoutPath(pathname)
  const isPublicMarketing = pathname === '/'
  const isPublicSeo = isPublicSeoPath(pathname)
  const isPublicLegal = isPublicLegalPath(pathname)
  const isSignupRegisterCheckout = isSignupRegisterCheckoutRequest(
    pathname,
    request.nextUrl.searchParams
  )

  const isPublicRoute =
    isAuthRoute ||
    isPublicApi ||
    isPublicOnboarding ||
    isPublicSignupCheckout ||
    isPublicMarketing ||
    isPublicSeo ||
    isPublicLegal

  if (!hasSupabaseSessionCookies(request)) {
    if (!isPublicRoute) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  const emailConfirmed = Boolean(user?.email_confirmed_at)

  let requiresMfaStep = false
  if (user && emailConfirmed) {
    requiresMfaStep = await needsMfaVerificationServer(supabase)
  }

  if (
    requiresMfaStep &&
    !isAuthRoute &&
    !isPublicOnboarding &&
    !isSignupRegisterCheckout
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('mfa', '1')
    return NextResponse.redirect(url)
  }

  const isAuthConfirm = pathname.startsWith('/auth/confirm')

  if (
    user &&
    !emailConfirmed &&
    !isAuthRoute &&
    !isAuthConfirm &&
    !isPublicApi &&
    !isPublicOnboarding &&
    !isPublicSignupCheckout &&
    !isSignupRegisterCheckout
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('verify', '1')
    if (user.email) url.searchParams.set('email', user.email)
    return NextResponse.redirect(url)
  }

  const isRenewOrBilling =
    pathname.startsWith('/settings/billing') ||
    pathname.startsWith('/onboarding/') ||
    pathname === '/checkout'

  async function redirectAfterAuthLanding() {
    const needsPlan = await adminNeedsSubscription(supabase, user!.id)
    const url = request.nextUrl.clone()
    if (needsPlan) {
      url.pathname = '/onboarding/subscription'
      url.searchParams.set('renew', '1')
    } else {
      url.pathname = '/projects'
      url.searchParams.delete('renew')
    }
    return NextResponse.redirect(url)
  }

  if (
    user &&
    emailConfirmed &&
    pathname === '/login' &&
    !request.nextUrl.searchParams.has('reset') &&
    !requiresMfaStep
  ) {
    return redirectAfterAuthLanding()
  }

  if (user && emailConfirmed && pathname === '/') {
    return redirectAfterAuthLanding()
  }

  if (
    user &&
    emailConfirmed &&
    !isPublicRoute &&
    !isRenewOrBilling &&
    !isSignupRegisterCheckout &&
    !pathname.startsWith('/api/')
  ) {
    const needsPlan = await adminNeedsSubscription(supabase, user.id)
    if (needsPlan) {
      const url = request.nextUrl.clone()
      url.pathname = '/onboarding/subscription'
      url.searchParams.set('renew', '1')
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

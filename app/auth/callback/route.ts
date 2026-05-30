import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function safeNextPath(next: string | null) {
  if (!next || !next.startsWith('/') || next.startsWith('//')) {
    return '/projects'
  }
  return next
}

function isSignupVerifyReturn(path: string) {
  return (
    path.startsWith('/onboarding/email-verified') ||
    (path.startsWith('/checkout') && path.includes('register=1'))
  )
}

function appendEmailToPath(path: string, email: string, origin: string) {
  const url = new URL(path, origin)
  if (!url.searchParams.has('email')) {
    url.searchParams.set('email', email)
  }
  return `${url.pathname}${url.search}`
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = safeNextPath(searchParams.get('next'))

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user && !user.email_confirmed_at && !isSignupVerifyReturn(next)) {
        return NextResponse.redirect(
          `${origin}/login?verify=1&email=${encodeURIComponent(user.email || '')}`
        )
      }

      let destination = next
      if (user?.email && isSignupVerifyReturn(next)) {
        destination = appendEmailToPath(next, user.email, origin)
      }

      return NextResponse.redirect(`${origin}${destination}`)
    }

    const verifyError = encodeURIComponent(
      error.message || 'Email link expired or invalid'
    )
    return NextResponse.redirect(
      `${origin}/login?signup=admin&verify_error=${verifyError}`
    )
  }

  return NextResponse.redirect(`${origin}/login?verify=1`)
}

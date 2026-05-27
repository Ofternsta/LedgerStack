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
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  if (isSignupVerifyReturn(next)) {
    return NextResponse.redirect(`${origin}${next}`)
  }

  return NextResponse.redirect(`${origin}/login?verify=1`)
}

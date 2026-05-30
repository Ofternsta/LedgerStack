import { NextResponse } from 'next/server'
import { billingAppUrl } from '@/lib/stripe-config'

/** Legacy entry — forward query params to /auth/confirm. */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const origin = billingAppUrl()
  const confirmUrl = new URL('/auth/confirm', origin)
  url.searchParams.forEach((value, key) => {
    confirmUrl.searchParams.set(key, value)
  })
  return NextResponse.redirect(confirmUrl)
}

import { NextResponse } from 'next/server'
import {
  isEmailVerifiedAddress,
  isEmailVerifiedUser,
} from '@/lib/email-verification'
import { requireAuth } from '@/lib/require-auth'
import { normalizeSignupEmail } from '@/lib/trial-eligibility'

export async function GET(req: Request) {
  const paramEmail = new URL(req.url).searchParams.get('email')?.trim()

  if (paramEmail) {
    const email = normalizeSignupEmail(paramEmail)
    const verified = await isEmailVerifiedAddress(email)
    return NextResponse.json({ verified, email })
  }

  const { user } = await requireAuth()
  if (!user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.json({
    verified: isEmailVerifiedUser(user),
    email: user.email,
  })
}

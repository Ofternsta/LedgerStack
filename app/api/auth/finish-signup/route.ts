import { NextResponse } from 'next/server'
import { enforceRateLimit } from '@/lib/api-rate-limit'
import { finishPendingSignup, getSignupStatus } from '@/lib/finish-pending-signup'

const GENERIC_STATUS = {
  accountReady: false as const,
  pending: true as const,
  message:
    'If checkout completed for this email, we are finishing your account. Check your inbox for a verification link.',
}

export async function GET(req: Request) {
  try {
    const limited = await enforceRateLimit(req, 'auth:finish-signup', 20)
    if (limited) return limited

    const email = new URL(req.url).searchParams.get('email')?.trim()
    if (!email) {
      return NextResponse.json({ error: 'email is required' }, { status: 400 })
    }

    const status = await getSignupStatus(email)
    if (status.accountReady) {
      return NextResponse.json({ accountReady: true, email: status.email })
    }

    return NextResponse.json({
      ...GENERIC_STATUS,
      email: status.email,
      needsEmailVerification: Boolean(
        'needsEmailVerification' in status && status.needsEmailVerification
      ),
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Status check failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const limited = await enforceRateLimit(req, 'auth:finish-signup', 10)
    if (limited) return limited

    const body = await req.json().catch(() => ({}))
    const email = String(body.email || '').trim()
    if (!email) {
      return NextResponse.json({ error: 'email is required' }, { status: 400 })
    }

    const result = await finishPendingSignup(email)
    if (result.error && !result.accountReady) {
      return NextResponse.json(
        {
          accountReady: false,
          message:
            'We could not finish signup yet. If you completed checkout, wait a moment and try again.',
        },
        { status: 400 }
      )
    }
    return NextResponse.json(result)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Finish signup failed'
    console.error('finish-signup error:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

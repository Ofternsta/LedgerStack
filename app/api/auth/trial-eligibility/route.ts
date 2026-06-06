import { NextResponse } from 'next/server'
import { enforceRateLimit } from '@/lib/api-rate-limit'
import { emailHasUsedTrial } from '@/lib/trial-eligibility'

export async function GET(req: Request) {
  try {
    const limited = await enforceRateLimit(req, 'auth:trial-eligibility', 30)
    if (limited) return limited

    const email = new URL(req.url).searchParams.get('email')?.trim()
    if (!email) {
      return NextResponse.json(
        { error: 'email query parameter required' },
        { status: 400 }
      )
    }

    const used = await emailHasUsedTrial(email)

    return NextResponse.json({ trialAvailable: !used })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Check failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

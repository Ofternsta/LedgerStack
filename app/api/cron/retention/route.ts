import { NextResponse } from 'next/server'
import { runProjectRetention } from '@/lib/project-retention'

export const maxDuration = 300

/** Vercel Cron: purge completed projects (7d) and inactive projects (12mo). */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json(
      { error: 'CRON_SECRET is not configured' },
      { status: 503 }
    )
  }

  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await runProjectRetention()
    return NextResponse.json({ ok: true, ...result })
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Retention cron failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

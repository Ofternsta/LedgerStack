import { NextResponse } from 'next/server'
import { runAllDueScheduledBackups } from '@/lib/organization-backups'

export const maxDuration = 300

/** Vercel Cron: daily check for orgs with automatic backups enabled. */
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
    const result = await runAllDueScheduledBackups()
    return NextResponse.json({
      ok: true,
      organizations: result.orgs,
      projects: result.projects,
      errors: result.errors,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Cron backup failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

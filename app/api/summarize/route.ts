import { NextResponse } from 'next/server'
import { summarizeText } from '@/lib/summarize-text'
import { requireAuth } from '@/lib/require-auth'

const MAX_INPUT_CHARS = 50_000

export async function POST(req: Request) {
  try {
    const { user } = await requireAuth()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { text } = await req.json()
    const input = String(text || '').slice(0, MAX_INPUT_CHARS)
    const summary = await summarizeText(input)
    return NextResponse.json({ summary })
  } catch {
    return NextResponse.json({ error: 'Could not summarize text' }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { handleSignWellWebhookEvent } from '@/lib/signature-requests-server'

type SignWellWebhookBody = {
  event?: {
    type?: string
    hash?: string
    time?: number
    related_signer?: { name?: string; email?: string }
  }
  data?: {
    object?: {
      id?: string
      status?: string
      metadata?: Record<string, string>
    }
    id?: string
    metadata?: Record<string, string>
  }
}

/** SignWell document lifecycle webhooks */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as SignWellWebhookBody
  const eventType = body.event?.type

  if (!eventType) {
    return NextResponse.json({ error: 'Missing event type' }, { status: 400 })
  }

  const data = {
    ...(body.data || {}),
    related_signer: body.event?.related_signer,
  }

  try {
    await handleSignWellWebhookEvent(eventType, data)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Webhook handler failed'
    console.error('[signwell webhook]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}

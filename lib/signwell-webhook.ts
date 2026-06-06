import 'server-only'

import { createHmac, timingSafeEqual } from 'crypto'
import { signwellWebhookId } from '@/lib/signwell-config'

export type SignWellWebhookEvent = {
  type?: string
  time?: number
  hash?: string
}

/** HMAC-SHA256(type@time) using the SignWell webhook secret id. */
export function verifySignWellWebhookEvent(event: SignWellWebhookEvent): boolean {
  const webhookId = signwellWebhookId()
  if (!webhookId) {
    console.error('[signwell webhook] SIGNWELL_WEBHOOK_ID is not configured')
    return false
  }

  const type = event.type?.trim()
  const time = event.time
  const expected = event.hash?.trim()

  if (!type || time === undefined || time === null || !expected) {
    return false
  }

  const data = `${type}@${time}`
  const calculated = createHmac('sha256', webhookId).update(data).digest('hex')

  try {
    const a = Buffer.from(calculated, 'utf8')
    const b = Buffer.from(expected, 'utf8')
    if (a.length !== b.length) return false
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}

import 'server-only'

import { createServiceClient } from '@/lib/supabase/service'

const WINDOW_MS = 15 * 60 * 1000
const DEFAULT_MAX = 30

type RateLimitResult =
  | { ok: true }
  | { ok: false; retryAfterSec: number }

/** Best-effort DB-backed rate limit (service role). Fails open if table missing. */
export async function checkApiRateLimit(
  bucket: string,
  key: string,
  maxRequests = DEFAULT_MAX
): Promise<RateLimitResult> {
  try {
    const service = createServiceClient()
    const now = Date.now()

    const { data: rows, error: selectError } = await service
      .from('api_rate_limits')
      .select('id, hit_count, window_started_at')
      .eq('bucket', bucket)
      .eq('rate_key', key)
      .maybeSingle()

    if (selectError) {
      if (selectError.code === '42P01') return { ok: true }
      console.warn('api rate limit select failed:', selectError.message)
      return { ok: true }
    }

    if (!rows) {
      const { error: insertError } = await service.from('api_rate_limits').insert({
        bucket,
        rate_key: key,
        hit_count: 1,
        window_started_at: new Date(now).toISOString(),
      })
      if (insertError && insertError.code !== '42P01') {
        console.warn('api rate limit insert failed:', insertError.message)
      }
      return { ok: true }
    }

    const windowStarted = new Date(String(rows.window_started_at)).getTime()
    if (Number.isNaN(windowStarted) || now - windowStarted > WINDOW_MS) {
      await service
        .from('api_rate_limits')
        .update({
          hit_count: 1,
          window_started_at: new Date(now).toISOString(),
        })
        .eq('id', rows.id)
      return { ok: true }
    }

    const next = Number(rows.hit_count || 0) + 1
    if (next > maxRequests) {
      const retryAfterSec = Math.ceil(
        (windowStarted + WINDOW_MS - now) / 1000
      )
      return { ok: false, retryAfterSec: Math.max(retryAfterSec, 1) }
    }

    await service
      .from('api_rate_limits')
      .update({ hit_count: next })
      .eq('id', rows.id)

    return { ok: true }
  } catch (err) {
    console.warn('api rate limit unavailable:', err)
    return { ok: true }
  }
}

export function rateLimitKeyFromRequest(req: Request, suffix: string): string {
  const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  const ip = forwarded || req.headers.get('x-real-ip') || 'unknown'
  return `${ip}:${suffix}`
}

export async function enforceRateLimit(
  req: Request,
  bucket: string,
  maxRequests = DEFAULT_MAX
): Promise<Response | null> {
  const limited = await checkApiRateLimit(
    bucket,
    rateLimitKeyFromRequest(req, bucket),
    maxRequests
  )
  if (!limited.ok) {
    return new Response(JSON.stringify({ error: 'Too many requests' }), {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(limited.retryAfterSec),
      },
    })
  }
  return null
}

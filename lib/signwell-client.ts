import 'server-only'

import { fileExtension } from '@/lib/signwell-file-types'
import {
  SIGNWELL_API_BASE,
  signwellApiKey,
  signwellTestMode,
} from '@/lib/signwell-config'

export type SignWellRecipient = {
  id: string
  email: string
  name: string
  send_email?: boolean
  send_email_delay?: number
  embedded_signing_url?: string
  signing_url?: string
  status?: string
}

export type SignWellDocument = {
  id: string
  status: string
  name: string
  recipients: SignWellRecipient[]
  metadata?: Record<string, string>
}

type CreateDocumentInput = {
  name: string
  fileName: string
  fileUrl?: string
  fileBase64?: string
  recipientEmail: string
  recipientName: string
  metadata: Record<string, string>
  requesterName: string
  requesterEmail: string
  redirectUrl: string
  subject: string
  message: string
}

function formatSignWellError(payload: unknown, status: number): string {
  const p = payload as Record<string, unknown>

  if (typeof p.message === 'string' && p.message.trim()) {
    return p.message.trim()
  }

  const errors = p.errors as Record<string, string[] | string> | undefined
  if (errors && typeof errors === 'object') {
    const parts = Object.entries(errors).flatMap(([key, value]) => {
      const messages = Array.isArray(value) ? value : [String(value)]
      return messages.map((msg) => `${key}: ${msg}`)
    })
    if (parts.length) return parts.join('; ')
  }

  const meta = p.meta as { message?: string; messages?: string[] } | undefined
  if (meta?.messages?.length) return meta.messages.join('; ')
  if (meta?.message) return meta.message

  const raw = (p as { raw?: string }).raw
  if (typeof raw === 'string' && raw.trim()) {
    return raw.trim().slice(0, 500)
  }

  if (status === 402) {
    return 'SignWell API billing required — enable test mode or upgrade your SignWell API plan.'
  }

  return `SignWell request failed (${status})`
}

async function signwellFetch<T>(
  path: string,
  init?: RequestInit
): Promise<
  | { ok: true; data: T }
  | { ok: false; error: string; status: number }
> {
  const apiKey = signwellApiKey()
  if (!apiKey) {
    return { ok: false, error: 'SignWell API key not configured', status: 500 }
  }

  const res = await fetch(`${SIGNWELL_API_BASE}${path}`, {
    ...init,
    headers: {
      'X-Api-Key': apiKey,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  })

  const text = await res.text()
  let payload: unknown = {}
  try {
    payload = text ? JSON.parse(text) : {}
  } catch {
    payload = { raw: text }
  }

  if (!res.ok) {
    console.error('[signwell api]', path, res.status, text.slice(0, 1000))
    return {
      ok: false,
      error: formatSignWellError(payload, res.status),
      status: res.status,
    }
  }

  return { ok: true, data: payload as T }
}

/** SignWell expects a clean filename with a supported extension. */
export function signWellUploadFileName(rawName: string): string {
  const base = rawName.split(/[/\\]/).pop()?.trim() || 'document.pdf'
  const ext = fileExtension(base)
  if (ext) return base.slice(0, 120)
  return `${base.slice(0, 110)}.pdf`
}

export async function createSignWellDocument(
  input: CreateDocumentInput
): Promise<
  | { ok: true; document: SignWellDocument; embeddedSigningUrl: string }
  | { ok: false; error: string; status: number }
> {
  if (!input.fileUrl && !input.fileBase64) {
    return {
      ok: false,
      error: 'SignWell requires a file URL or file content.',
      status: 400,
    }
  }

  const uploadName = signWellUploadFileName(input.fileName)
  const filePayload = input.fileUrl
    ? { name: uploadName, file_url: input.fileUrl }
    : { name: uploadName, file_base64: input.fileBase64! }

  const result = await signwellFetch<SignWellDocument>('/documents', {
    method: 'POST',
    body: JSON.stringify({
      test_mode: signwellTestMode(),
      name: input.name.slice(0, 120) || uploadName,
      draft: false,
      with_signature_page: true,
      embedded_signing: true,
      allow_decline: true,
      reminders: false,
      expires_in: 90,
      custom_requester_name: input.requesterName.slice(0, 80),
      custom_requester_email: input.requesterEmail,
      redirect_url: input.redirectUrl,
      subject: input.subject.slice(0, 200),
      message: input.message.slice(0, 2000),
      metadata: input.metadata,
      files: [filePayload],
      recipients: [
        {
          id: '1',
          email: input.recipientEmail,
          name: input.recipientName.slice(0, 80) || input.recipientEmail,
          send_email: false,
        },
      ],
    }),
  })

  if (!result.ok) {
    return { ok: false, error: result.error, status: result.status }
  }

  const document = result.data
  const recipient = document.recipients?.[0]
  const embeddedSigningUrl =
    recipient?.embedded_signing_url || recipient?.signing_url || ''

  if (!document.id || !embeddedSigningUrl) {
    return {
      ok: false,
      error:
        'SignWell created the document but did not return an embedded signing URL. Your SignWell plan may require embedded signing on a higher tier.',
      status: 502,
    }
  }

  return { ok: true, document, embeddedSigningUrl }
}

export async function getSignWellDocument(
  documentId: string
): Promise<
  | { ok: true; document: SignWellDocument }
  | { ok: false; error: string }
> {
  const result = await signwellFetch<SignWellDocument>(`/documents/${documentId}`)
  if (!result.ok) {
    return { ok: false, error: result.error }
  }
  return { ok: true, document: result.data }
}

export async function getSignWellCompletedPdfUrl(
  documentId: string
): Promise<{ ok: true; fileUrl: string } | { ok: false; error: string }> {
  const apiKey = signwellApiKey()
  if (!apiKey) {
    return { ok: false, error: 'SignWell API key not configured' }
  }

  const res = await fetch(
    `${SIGNWELL_API_BASE}/documents/${documentId}/completed_pdf?url_only=true&audit_page=true`,
    {
      headers: { 'X-Api-Key': apiKey },
    }
  )

  const payload = await res.json().catch(() => ({}))
  if (!res.ok) {
    return {
      ok: false,
      error: formatSignWellError(payload, res.status),
    }
  }

  const fileUrl = payload.file_url as string | undefined
  if (!fileUrl) {
    return { ok: false, error: 'SignWell did not return a completed PDF URL' }
  }

  return { ok: true, fileUrl }
}

/** Resets expiration on an expired document so embedded signing can continue. */
export async function sendSignWellReminder(
  documentId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const result = await signwellFetch<unknown>(`/documents/${documentId}/remind`, {
    method: 'POST',
    body: JSON.stringify({}),
  })
  if (!result.ok) {
    return { ok: false, error: result.error }
  }
  return { ok: true }
}

export async function downloadUrlAsBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Download failed (${res.status})`)
  }
  const arrayBuffer = await res.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

export async function registerSignWellWebhook(
  callbackUrl: string
): Promise<
  | { ok: true; id: string; callback_url: string }
  | { ok: false; error: string }
> {
  const result = await signwellFetch<{ id: string; callback_url: string }>(
    '/hooks',
    {
      method: 'POST',
      body: JSON.stringify({ callback_url: callbackUrl }),
    }
  )
  if (!result.ok) {
    return { ok: false, error: result.error }
  }
  return {
    ok: true,
    id: result.data.id,
    callback_url: result.data.callback_url,
  }
}

export async function listSignWellWebhooks(): Promise<
  | { ok: true; hooks: Array<{ id: string; callback_url: string }> }
  | { ok: false; error: string }
> {
  const result = await signwellFetch<
    Array<{ id: string; callback_url: string }>
  >('/hooks')
  if (!result.ok) {
    return { ok: false, error: result.error }
  }
  return { ok: true, hooks: result.data }
}

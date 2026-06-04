import 'server-only'

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
  fileBase64: string
  recipientEmail: string
  recipientName: string
  metadata: Record<string, string>
  requesterName: string
  requesterEmail: string
  redirectUrl: string
  subject: string
  message: string
}

async function signwellFetch<T>(
  path: string,
  init?: RequestInit
): Promise<{ ok: true; data: T } | { ok: false; error: string; status: number }> {
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
    const message =
      typeof (payload as { message?: string }).message === 'string'
        ? (payload as { message: string }).message
        : `SignWell request failed (${res.status})`
    return { ok: false, error: message, status: res.status }
  }

  return { ok: true, data: payload as T }
}

export async function createSignWellDocument(
  input: CreateDocumentInput
): Promise<
  | { ok: true; document: SignWellDocument; embeddedSigningUrl: string }
  | { ok: false; error: string }
> {
  const result = await signwellFetch<SignWellDocument>('/documents', {
    method: 'POST',
    body: JSON.stringify({
      test_mode: signwellTestMode(),
      name: input.name,
      draft: false,
      with_signature_page: true,
      embedded_signing: true,
      embedded_signing_notifications: true,
      allow_decline: true,
      reminders: true,
      custom_requester_name: input.requesterName,
      custom_requester_email: input.requesterEmail,
      redirect_url: input.redirectUrl,
      subject: input.subject,
      message: input.message,
      metadata: input.metadata,
      files: [
        {
          name: input.fileName,
          file_base64: input.fileBase64,
        },
      ],
      recipients: [
        {
          id: '1',
          email: input.recipientEmail,
          name: input.recipientName,
          send_email: true,
          send_email_delay: 0,
        },
      ],
      fields: [[]],
    }),
  })

  if (!result.ok) {
    return { ok: false, error: result.error }
  }

  const document = result.data
  const recipient = document.recipients?.[0]
  const embeddedSigningUrl =
    recipient?.embedded_signing_url || recipient?.signing_url || ''

  if (!document.id || !embeddedSigningUrl) {
    return {
      ok: false,
      error: 'SignWell did not return a signing URL for this document.',
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
    const message =
      typeof payload.message === 'string'
        ? payload.message
        : `Could not fetch completed PDF (${res.status})`
    return { ok: false, error: message }
  }

  const fileUrl = payload.file_url as string | undefined
  if (!fileUrl) {
    return { ok: false, error: 'SignWell did not return a completed PDF URL' }
  }

  return { ok: true, fileUrl }
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

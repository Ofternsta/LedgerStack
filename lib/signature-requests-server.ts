import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  downloadUrlAsBuffer,
  createSignWellDocument,
  getSignWellCompletedPdfUrl,
  getSignWellDocument,
  sendSignWellReminder,
} from '@/lib/signwell-client'
import {
  newEvidenceId,
  readEvidenceMeta,
  saveEvidence,
} from '@/lib/evidence-storage'
import { listAllProjectEvidence } from '@/lib/evidence-storage'
import { getSharedFilePaths, setSharedFilePaths } from '@/lib/client-shared-files'
import {
  sendSignatureCompletedEmail,
  sendSignatureRequestedEmail,
  signatureProjectUrl,
  signatureSignPageUrl,
} from '@/lib/signature-emails'
import {
  isSignWellSignableFile,
  SIGNWELL_SIGNABLE_FORMATS_LABEL,
} from '@/lib/signwell-file-types'
import type { SignatureRequestRow } from '@/lib/signature-request-types'
import { billingAppUrl } from '@/lib/stripe-config'
import { createServiceClient } from '@/lib/supabase/service'

import {
  ensureSignedDocumentsCategoryOnProject,
  SIGNED_DOCUMENTS_CATEGORY_LABEL,
} from '@/lib/project-file-categories'

const BUCKET = 'project-files'

export const SIGNED_DOCUMENTS_LABEL = SIGNED_DOCUMENTS_CATEGORY_LABEL

function sanitizeSignedFileName(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 80)
}

function displayNameFromEmail(email: string) {
  const local = email.split('@')[0] || 'Client'
  return local.replace(/[._-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export async function createSignatureRequest(input: {
  supabase: SupabaseClient
  adminUserId: string
  projectId: string
  projectClientAccessId: string
  sourceFilePath: string
}): Promise<
  | { ok: true; request: SignatureRequestRow }
  | { ok: false; error: string; status?: number }
> {
  const service = createServiceClient()

  const { data: project } = await input.supabase
    .from('projects')
    .select('id, organization_id, customer_name, file_categories')
    .eq('id', input.projectId)
    .maybeSingle()

  if (!project) {
    return { ok: false, error: 'Project not found', status: 404 }
  }

  const { data: org } = await input.supabase
    .from('organizations')
    .select('id, name, admin_user_id')
    .eq('id', project.organization_id)
    .eq('admin_user_id', input.adminUserId)
    .maybeSingle()

  if (!org) {
    return { ok: false, error: 'Forbidden', status: 403 }
  }

  const { data: access } = await service
    .from('project_client_access')
    .select('id, client_email, status, user_id')
    .eq('id', input.projectClientAccessId)
    .eq('project_id', input.projectId)
    .maybeSingle()

  if (!access || access.status !== 'approved') {
    return {
      ok: false,
      error: 'Client access must be approved before requesting a signature.',
      status: 400,
    }
  }

  const clientEmail = String(access.client_email).trim().toLowerCase()
  const files = await listAllProjectEvidence(service, input.projectId)
  const file = files.find((f) => f.file_path === input.sourceFilePath)
  if (!file) {
    return { ok: false, error: 'File not found on this project.', status: 404 }
  }

  if (!isSignWellSignableFile(file)) {
    return {
      ok: false,
      error: `This file type cannot be sent for signature. Use ${SIGNWELL_SIGNABLE_FORMATS_LABEL}.`,
      status: 400,
    }
  }

  const { data: existingPending } = await service
    .from('signature_requests')
    .select('id')
    .eq('project_client_access_id', input.projectClientAccessId)
    .eq('source_file_path', input.sourceFilePath)
    .in('status', ['pending', 'viewed'])
    .maybeSingle()

  if (existingPending) {
    return {
      ok: false,
      error: 'A signature request is already pending for this file and client.',
      status: 409,
    }
  }

  await ensureSignedDocumentsCategoryOnProject(service, input.projectId)

  const { data: adminProfile } = await service
    .from('profiles')
    .select('email, full_name')
    .eq('id', input.adminUserId)
    .maybeSingle()

  const requesterEmail =
    adminProfile?.email?.trim() || `support@ledgerstack.org`
  const requesterName =
    adminProfile?.full_name?.trim() || org.name || 'LedgerStack'

  const { data: fileBlob, error: downloadError } = await service.storage
    .from(BUCKET)
    .download(input.sourceFilePath)

  if (downloadError || !fileBlob) {
    return {
      ok: false,
      error: downloadError?.message || 'Could not read the document file.',
      status: 500,
    }
  }

  const fileBase64 = Buffer.from(await fileBlob.arrayBuffer()).toString('base64')

  const requestId = crypto.randomUUID()
  const signUrl = signatureSignPageUrl(input.projectId, requestId)
  const redirectUrl = `${signUrl}?completed=1`
  const now = new Date().toISOString()

  const pendingRow = {
    id: requestId,
    organization_id: project.organization_id,
    project_id: input.projectId,
    project_client_access_id: input.projectClientAccessId,
    client_email: clientEmail,
    source_file_path: input.sourceFilePath,
    source_file_name: file.file_name,
    claim_id: file.claim_id || null,
    signwell_document_id: null,
    embedded_signing_url: null,
    status: 'pending' as const,
    signed_file_path: null,
    typed_signer_name: null,
    requested_by_user_id: input.adminUserId,
    requested_at: now,
    completed_at: null,
    created_at: now,
    updated_at: now,
  }

  const { error: insertError } = await service
    .from('signature_requests')
    .insert(pendingRow)

  if (insertError) {
    return { ok: false, error: insertError.message, status: 500 }
  }

  const signwell = await createSignWellDocument({
    name: file.file_name,
    fileName: file.file_name,
    fileBase64,
    recipientEmail: clientEmail,
    recipientName: displayNameFromEmail(clientEmail),
    requesterName,
    requesterEmail,
    redirectUrl,
    subject: `Please sign: ${file.file_name}`,
    message: `${org.name || 'Your contractor'} requested your signature on ${file.file_name} for ${project.customer_name}.`,
    metadata: {
      signature_request_id: requestId,
      project_id: input.projectId,
      organization_id: String(project.organization_id),
    },
  })

  if (!signwell.ok) {
    await service.from('signature_requests').delete().eq('id', requestId)
    console.error('[signwell create document]', signwell.error)
    return {
      ok: false,
      error: signwell.error,
      status: signwell.status >= 400 && signwell.status < 500 ? signwell.status : 502,
    }
  }

  const { data: inserted, error: updateError } = await service
    .from('signature_requests')
    .update({
      signwell_document_id: signwell.document.id,
      embedded_signing_url:
        signwell.browserSigningUrl || signwell.embeddedSigningUrl,
      updated_at: new Date().toISOString(),
    })
    .eq('id', requestId)
    .select('*')
    .single()

  if (updateError || !inserted) {
    await service.from('signature_requests').delete().eq('id', requestId)
    return {
      ok: false,
      error: updateError?.message || 'Could not save request',
      status: 500,
    }
  }

  const sharedPaths = await getSharedFilePaths(input.projectClientAccessId)
  if (!sharedPaths.has(input.sourceFilePath)) {
    await setSharedFilePaths(input.projectClientAccessId, input.projectId, [
      ...sharedPaths,
      input.sourceFilePath,
    ])
  }

  await sendSignatureRequestedEmail({
    to: clientEmail,
    organizationName: org.name || 'Your contractor',
    projectName: project.customer_name,
    fileName: file.file_name,
    signUrl,
  })

  if (access.user_id) {
    await service.from('user_notifications').insert({
      user_id: access.user_id,
      type: 'signature_requested',
      title: 'Signature requested',
      body: `${org.name || 'Your contractor'} asked you to sign ${file.file_name}.`,
      href: signUrl,
      reference_id: requestId,
    })
  }

  return { ok: true, request: inserted as SignatureRequestRow }
}

function pickClientSigningUrl(recipient: {
  signing_url?: string
  embedded_signing_url?: string
} | undefined): string | null {
  if (!recipient) return null
  return recipient.signing_url || recipient.embedded_signing_url || null
}

/** Create a new SignWell document for an existing request (same file/client). */
export async function reissueSignWellDocumentForRequest(
  request: SignatureRequestRow
): Promise<{ url: string | null; error?: string }> {
  const service = createServiceClient()

  const { data: project } = await service
    .from('projects')
    .select('id, organization_id, customer_name')
    .eq('id', request.project_id)
    .maybeSingle()

  if (!project) {
    return { url: null, error: 'Project not found.' }
  }

  const { data: org } = await service
    .from('organizations')
    .select('name, admin_user_id')
    .eq('id', request.organization_id)
    .maybeSingle()

  const { data: adminProfile } = org?.admin_user_id
    ? await service
        .from('profiles')
        .select('email, full_name')
        .eq('id', org.admin_user_id)
        .maybeSingle()
    : { data: null }

  const requesterEmail =
    adminProfile?.email?.trim() || `support@ledgerstack.org`
  const requesterName =
    adminProfile?.full_name?.trim() || org?.name || 'LedgerStack'

  const { data: fileBlob, error: downloadError } = await service.storage
    .from(BUCKET)
    .download(request.source_file_path)

  if (downloadError || !fileBlob) {
    return {
      url: null,
      error: downloadError?.message || 'Could not read the document file.',
    }
  }

  const fileBase64 = Buffer.from(await fileBlob.arrayBuffer()).toString('base64')
  const signUrl = signatureSignPageUrl(request.project_id, request.id)
  const redirectUrl = `${signUrl}?completed=1`

  const signwell = await createSignWellDocument({
    name: request.source_file_name,
    fileName: request.source_file_name,
    fileBase64,
    recipientEmail: request.client_email,
    recipientName: displayNameFromEmail(request.client_email),
    requesterName,
    requesterEmail,
    redirectUrl,
    subject: `Please sign: ${request.source_file_name}`,
    message: `${org?.name || 'Your contractor'} requested your signature on ${request.source_file_name} for ${project.customer_name}.`,
    metadata: {
      signature_request_id: request.id,
      project_id: request.project_id,
      organization_id: String(request.organization_id),
    },
  })

  if (!signwell.ok) {
    console.error('[signwell reissue document]', signwell.error)
    return {
      url: null,
      error:
        signwell.error ||
        'Could not create a new signing session. Ask your contractor to send a new request.',
    }
  }

  const url =
    signwell.browserSigningUrl || signwell.embeddedSigningUrl || null

  await service
    .from('signature_requests')
    .update({
      signwell_document_id: signwell.document.id,
      embedded_signing_url: url,
      status: 'pending',
      updated_at: new Date().toISOString(),
    })
    .eq('id', request.id)

  return { url }
}

export async function refreshEmbeddedSigningUrl(
  request: SignatureRequestRow,
  options?: { forceReissue?: boolean }
): Promise<{ url: string | null; error?: string }> {
  if (!request.signwell_document_id) {
    return {
      url: request.embedded_signing_url,
      error: request.embedded_signing_url ? undefined : 'No SignWell document linked.',
    }
  }

  if (options?.forceReissue) {
    return reissueSignWellDocumentForRequest(request)
  }

  const service = createServiceClient()

  async function pullSigningUrl(): Promise<
    | { ok: true; url: string | null; status: string; recipientStatus: string }
    | { ok: false; error: string }
  > {
    const doc = await getSignWellDocument(request.signwell_document_id!)
    if (!doc.ok) {
      return { ok: false, error: doc.error }
    }

    const recipient = doc.document.recipients?.find(
      (r) => r.email.toLowerCase() === request.client_email.toLowerCase()
    )
    const url = pickClientSigningUrl(recipient)

    return {
      ok: true,
      url,
      status: doc.document.status || '',
      recipientStatus: recipient?.status || '',
    }
  }

  const remind = await sendSignWellReminder(request.signwell_document_id)
  if (!remind.ok) {
    console.warn(
      '[signwell refresh] remind skipped:',
      request.id,
      remind.error
    )
  }

  let pulled = await pullSigningUrl()
  if (!pulled.ok) {
    return { url: null, error: pulled.error }
  }

  const statusLower = pulled.status.toLowerCase()
  const recipientLower = pulled.recipientStatus.toLowerCase()

  if (
    statusLower === 'expired' ||
    statusLower === 'canceled' ||
    statusLower === 'declined' ||
    request.status === 'expired'
  ) {
    return reissueSignWellDocumentForRequest(request)
  }

  if (statusLower === 'completed' || recipientLower === 'completed') {
    return {
      url: null,
      error: 'This document is already signed. Refresh the project page.',
    }
  }

  if (!pulled.url) {
    return reissueSignWellDocumentForRequest(request)
  }

  console.info('[signwell refresh]', {
    requestId: request.id,
    documentId: request.signwell_document_id,
    status: pulled.status,
    recipientStatus: pulled.recipientStatus,
    reminded: remind.ok,
  })

  if (pulled.url !== request.embedded_signing_url) {
    await service
      .from('signature_requests')
      .update({
        embedded_signing_url: pulled.url,
        updated_at: new Date().toISOString(),
      })
      .eq('id', request.id)
  }

  return { url: pulled.url }
}

export async function markSignatureRequestViewed(requestId: string) {
  const service = createServiceClient()
  await service
    .from('signature_requests')
    .update({ status: 'viewed', updated_at: new Date().toISOString() })
    .eq('id', requestId)
    .eq('status', 'pending')
}

export async function completeSignatureRequest(
  requestId: string,
  options?: { typedSignerName?: string }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const service = createServiceClient()

  const { data: request } = await service
    .from('signature_requests')
    .select('*')
    .eq('id', requestId)
    .maybeSingle()

  if (!request) {
    return { ok: false, error: 'Signature request not found' }
  }

  if (request.status === 'signed' && request.signed_file_path) {
    const existingMeta = await readEvidenceMeta(
      service,
      request.signed_file_path
    )
    if (existingMeta) {
      return { ok: true }
    }
  }

  if (!request.signwell_document_id) {
    return { ok: false, error: 'Missing SignWell document id' }
  }

  if (!['pending', 'viewed'].includes(request.status)) {
    return { ok: false, error: `Request is ${request.status} and cannot be completed.` }
  }

  const claimId = request.claim_id as string | null
  const prefix = claimId
    ? `${request.project_id}/${claimId}`
    : `${request.project_id}`
  const signedName = `signed-${requestId.slice(0, 8)}-${sanitizeSignedFileName(request.source_file_name)}`
  const signedFilePath = `${prefix}/${signedName}`
  const completedAt = new Date().toISOString()

  const { data: claimed } = await service
    .from('signature_requests')
    .update({
      status: 'signed',
      signed_file_path: signedFilePath,
      typed_signer_name: options?.typedSignerName || null,
      completed_at: completedAt,
      updated_at: completedAt,
    })
    .eq('id', requestId)
    .in('status', ['pending', 'viewed'])
    .select('*')
    .maybeSingle()

  if (!claimed) {
    const { data: existing } = await service
      .from('signature_requests')
      .select('status, signed_file_path')
      .eq('id', requestId)
      .maybeSingle()

    if (existing?.status === 'signed' && existing.signed_file_path) {
      return { ok: true }
    }

    return { ok: false, error: 'Could not complete signature request.' }
  }

  const existingMeta = await readEvidenceMeta(service, signedFilePath)
  if (existingMeta) {
    return { ok: true }
  }

  const pdf = await getSignWellCompletedPdfUrl(request.signwell_document_id)
  if (!pdf.ok) {
    await service
      .from('signature_requests')
      .update({
        status: request.status,
        signed_file_path: null,
        typed_signer_name: null,
        completed_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId)
      .eq('signed_file_path', signedFilePath)

    return { ok: false, error: pdf.error }
  }

  const pdfBuffer = await downloadUrlAsBuffer(pdf.fileUrl)

  const { error: uploadError } = await service.storage
    .from(BUCKET)
    .upload(signedFilePath, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: true,
    })

  if (uploadError) {
    await service
      .from('signature_requests')
      .update({
        status: request.status,
        signed_file_path: null,
        typed_signer_name: null,
        completed_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId)
      .eq('signed_file_path', signedFilePath)

    return { ok: false, error: uploadError.message }
  }

  await ensureSignedDocumentsCategoryOnProject(service, request.project_id)

  const sourceMeta = await readEvidenceMeta(service, request.source_file_path)
  const signerLabel =
    options?.typedSignerName?.trim() || request.client_email

  const resolvedClaimId =
    claimId || sourceMeta?.claim_id || null
  if (!resolvedClaimId) {
    await service
      .from('signature_requests')
      .update({
        status: 'pending',
        signed_file_path: null,
        completed_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId)

    return {
      ok: false,
      error: 'Could not determine which job this signed document belongs to.',
    }
  }

  const record = {
    id: newEvidenceId(),
    claim_id: resolvedClaimId,
    file_name: signedName,
    file_path: signedFilePath,
    file_type: 'application/pdf',
    evidence_type: SIGNED_DOCUMENTS_LABEL,
    summary: `Signed copy of ${request.source_file_name} (signed by ${signerLabel})`,
    created_at: completedAt,
    uploaded_by_id: undefined,
    uploaded_by_name: signerLabel,
    uploaded_by_role: 'client' as const,
    uploaded_by_label: signerLabel,
  }

  await saveEvidence(service, record)

  const sharedPaths = await getSharedFilePaths(request.project_client_access_id)
  if (!sharedPaths.has(signedFilePath)) {
    await setSharedFilePaths(request.project_client_access_id, request.project_id, [
      ...sharedPaths,
      signedFilePath,
    ])
  }

  const { data: project } = await service
    .from('projects')
    .select('customer_name, organization_id')
    .eq('id', request.project_id)
    .maybeSingle()

  const { data: org } = await service
    .from('organizations')
    .select('name, admin_user_id')
    .eq('id', request.organization_id)
    .maybeSingle()

  const { data: adminProfile } = org?.admin_user_id
    ? await service
        .from('profiles')
        .select('email')
        .eq('id', org.admin_user_id)
        .maybeSingle()
    : { data: null }

  if (adminProfile?.email) {
    await sendSignatureCompletedEmail({
      to: adminProfile.email,
      clientEmail: request.client_email,
      projectName: project?.customer_name || 'Project',
      fileName: request.source_file_name,
      projectUrl: signatureProjectUrl(request.project_id),
    })
  }

  if (org?.admin_user_id) {
    const { data: existingNotice } = await service
      .from('user_notifications')
      .select('id')
      .eq('user_id', org.admin_user_id)
      .eq('type', 'signature_completed')
      .eq('reference_id', requestId)
      .maybeSingle()

    if (!existingNotice) {
      await service.from('user_notifications').insert({
        user_id: org.admin_user_id,
        type: 'signature_completed',
        title: 'Document signed',
        body: `${signerLabel} signed ${request.source_file_name}.`,
        href: `${signatureProjectUrl(request.project_id)}#signed-documents`,
        reference_id: requestId,
      })
    }
  }

  if (request.project_client_access_id) {
    const { data: access } = await service
      .from('project_client_access')
      .select('user_id')
      .eq('id', request.project_client_access_id)
      .maybeSingle()

    if (access?.user_id) {
      const { data: clientNotice } = await service
        .from('user_notifications')
        .select('id')
        .eq('user_id', access.user_id)
        .eq('type', 'signature_completed')
        .eq('reference_id', requestId)
        .maybeSingle()

      if (!clientNotice) {
        await service.from('user_notifications').insert({
          user_id: access.user_id,
          type: 'signature_completed',
          title: 'Thank you — document signed',
          body: `You signed ${request.source_file_name}.`,
          href: `${billingAppUrl()}/project/${request.project_id}`,
          reference_id: requestId,
        })
      }
    }
  }

  return { ok: true }
}

export async function handleSignWellWebhookEvent(eventType: string, data: unknown) {
  const payload = data as {
    object?: { id?: string; status?: string; metadata?: Record<string, string> }
    id?: string
    metadata?: Record<string, string>
  }

  const documentId = payload.object?.id || payload.id
  const metadata = payload.object?.metadata || payload.metadata || {}
  let requestId = metadata.signature_request_id

  const service = createServiceClient()

  if (!requestId && documentId) {
    const { data: byDoc } = await service
      .from('signature_requests')
      .select('id')
      .eq('signwell_document_id', documentId)
      .maybeSingle()
    requestId = byDoc?.id
  }

  if (!requestId) return

  if (eventType === 'document_viewed') {
    await markSignatureRequestViewed(requestId)
    return
  }

  if (eventType === 'document_declined') {
    await service
      .from('signature_requests')
      .update({ status: 'declined', updated_at: new Date().toISOString() })
      .eq('id', requestId)
      .in('status', ['pending', 'viewed'])
    return
  }

  if (eventType === 'document_expired') {
    await service
      .from('signature_requests')
      .update({ status: 'expired', updated_at: new Date().toISOString() })
      .eq('id', requestId)
      .in('status', ['pending', 'viewed'])
    return
  }

  if (eventType === 'document_completed') {
    const relatedSigner = (
      data as { related_signer?: { name?: string } }
    )?.related_signer
    await completeSignatureRequest(requestId, {
      typedSignerName: relatedSigner?.name,
    })
  }
}

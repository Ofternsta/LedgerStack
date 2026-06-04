import 'server-only'

import { authEmailAppName } from '@/lib/auth-email-config'
import { billingAppUrl } from '@/lib/stripe-config'
import { sendTransactionalEmail } from '@/lib/transactional-email'

function emailShell(title: string, bodyHtml: string) {
  const appName = authEmailAppName()
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f1419;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f1419;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#1a2332;border:1px solid #2d3a4d;border-radius:16px;padding:32px 28px;">
        <tr><td style="color:#4ade80;font-size:13px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;">${appName}</td></tr>
        <tr><td style="padding-top:12px;color:#f8fafc;font-size:20px;font-weight:700;line-height:1.3;">${title}</td></tr>
        <tr><td style="padding-top:12px;color:#94a3b8;font-size:15px;line-height:1.5;">${bodyHtml}</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export async function sendSignatureRequestedEmail(input: {
  to: string
  organizationName: string
  projectName: string
  fileName: string
  signUrl: string
}) {
  const appName = authEmailAppName()
  const subject = `${input.organizationName} requested your signature on ${input.fileName}`
  const html = emailShell(
    'Signature requested',
    `<p><strong>${input.organizationName}</strong> asked you to sign <strong>${input.fileName}</strong> for project <strong>${input.projectName}</strong>.</p>
     <p style="padding-top:16px;"><a href="${input.signUrl}" style="display:inline-block;background:#22c55e;color:#052e16;text-decoration:none;font-weight:600;font-size:15px;padding:14px 24px;border-radius:10px;">Review and sign in ${appName}</a></p>
     <p style="padding-top:16px;color:#64748b;font-size:12px;">You will type your name to sign electronically. If the button does not work, copy this link:<br><a href="${input.signUrl}" style="color:#4ade80;word-break:break-all;">${input.signUrl}</a></p>`
  )
  const text = `${input.organizationName} requested your signature on ${input.fileName} (${input.projectName}). Sign here: ${input.signUrl}`

  return sendTransactionalEmail({ to: input.to, subject, html, text })
}

export async function sendSignatureCompletedEmail(input: {
  to: string
  clientEmail: string
  projectName: string
  fileName: string
  projectUrl: string
}) {
  const subject = `Signed: ${input.fileName} — ${input.clientEmail}`
  const html = emailShell(
    'Document signed',
    `<p><strong>${input.clientEmail}</strong> signed <strong>${input.fileName}</strong> on project <strong>${input.projectName}</strong>.</p>
     <p style="padding-top:16px;"><a href="${input.projectUrl}" style="display:inline-block;background:#22c55e;color:#052e16;text-decoration:none;font-weight:600;font-size:15px;padding:14px 24px;border-radius:10px;">View project</a></p>`
  )
  const text = `${input.clientEmail} signed ${input.fileName} on ${input.projectName}. View: ${input.projectUrl}`

  return sendTransactionalEmail({ to: input.to, subject, html, text })
}

export function signatureSignPageUrl(projectId: string, requestId: string) {
  return `${billingAppUrl()}/project/${projectId}/sign/${requestId}`
}

export function signatureProjectUrl(projectId: string) {
  return `${billingAppUrl()}/project/${projectId}`
}

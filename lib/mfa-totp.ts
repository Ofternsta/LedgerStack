/** Normalize Supabase TOTP qr_code for use in <img src>. */
export function totpQrImageSrc(qrCode: string | null | undefined): string | null {
  if (!qrCode?.trim()) return null
  const trimmed = qrCode.trim()
  if (trimmed.startsWith('data:')) return trimmed
  if (trimmed.startsWith('<')) {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(trimmed)}`
  }
  return `data:image/svg+xml;utf-8,${trimmed}`
}

/** Client + server safe file helpers (no pdf-parse / server-only). */

export function inferUploadMimeType(file: {
  name: string
  type?: string
}): string {
  const declared = (file.type || '').toLowerCase().trim()
  if (declared && declared !== 'application/octet-stream') {
    return declared
  }

  const name = (file.name || '').toLowerCase()

  if (name.endsWith('.pdf')) return 'application/pdf'
  if (name.endsWith('.heic')) return 'image/heic'
  if (name.endsWith('.heif')) return 'image/heif'
  if (name.endsWith('.png')) return 'image/png'
  if (name.endsWith('.webp')) return 'image/webp'
  if (name.endsWith('.gif')) return 'image/gif'
  if (name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'image/jpeg'
  if (name.endsWith('.docx')) {
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  }

  // iOS Safari camera capture often uses a generic name with no MIME type
  if (/^image\.(jpe?g|png|heic|heif)$/i.test(file.name)) {
    return 'image/jpeg'
  }
  if (/^photo-/i.test(file.name)) return 'image/jpeg'
  if (/^img_/i.test(file.name)) return 'image/jpeg'

  return declared || 'application/octet-stream'
}

export function defaultNameForMime(mime: string): string {
  if (mime === 'application/pdf') return `document-${Date.now()}.pdf`
  if (mime.startsWith('image/')) {
    const ext = mime.includes('png') ? 'png' : mime.includes('heic') ? 'heic' : 'jpg'
    return `photo-${Date.now()}.${ext}`
  }
  return `upload-${Date.now()}`
}

export async function normalizeUploadFile(file: File): Promise<File> {
  const mime = inferUploadMimeType(file)
  const name = file.name?.trim() || defaultNameForMime(mime)

  if (file.type === mime && file.name === name) {
    return file
  }

  const buffer = await file.arrayBuffer()
  return new File([buffer], name, { type: mime })
}

export function describeFile(file: { name: string; size: number; type: string }) {
  const sizeKb = Math.max(1, Math.round(file.size / 1024))
  const type = inferUploadMimeType(file) || 'unknown type'
  return `${file.name} (${sizeKb} KB, ${type})`
}

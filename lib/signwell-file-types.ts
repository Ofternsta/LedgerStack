/** File types SignWell accepts on document create (file_url / file_base64). */

export const SIGNWELL_SIGNABLE_EXTENSIONS = [
  'pdf',
  'doc',
  'docx',
  'pages',
  'ppt',
  'pptx',
  'key',
  'xls',
  'xlsx',
  'numbers',
  'jpg',
  'jpeg',
  'png',
  'tiff',
  'tif',
  'webp',
  'html',
  'htm',
] as const

export type SignWellSignableExtension =
  (typeof SIGNWELL_SIGNABLE_EXTENSIONS)[number]

/** Short label for admin UI empty states */
export const SIGNWELL_SIGNABLE_FORMATS_LABEL =
  'PDF, Word, Excel, PowerPoint, Pages/Numbers/Key, images (JPG, PNG, …), or HTML'

export function fileExtension(name: string): string | null {
  const trimmed = name.trim().toLowerCase()
  const dot = trimmed.lastIndexOf('.')
  if (dot <= 0 || dot === trimmed.length - 1) return null
  return trimmed.slice(dot + 1)
}

export function isSignWellSignableFileName(fileName: string): boolean {
  const ext = fileExtension(fileName)
  if (!ext) return false
  return (SIGNWELL_SIGNABLE_EXTENSIONS as readonly string[]).includes(ext)
}

export function isSignWellSignableFile(file: {
  file_name: string
  file_type?: string | null
}): boolean {
  if (isSignWellSignableFileName(file.file_name)) return true

  const mime = (file.file_type || '').toLowerCase()
  if (!mime) return false

  if (mime === 'application/pdf') return true
  if (mime.startsWith('image/')) {
    return (
      mime.includes('jpeg') ||
      mime.includes('jpg') ||
      mime.includes('png') ||
      mime.includes('webp') ||
      mime.includes('tiff') ||
      mime.includes('tif')
    )
  }
  if (mime === 'text/html') return true
  if (mime.includes('wordprocessingml') || mime === 'application/msword') {
    return true
  }
  if (mime.includes('spreadsheetml') || mime === 'application/vnd.ms-excel') {
    return true
  }
  if (mime.includes('presentationml') || mime === 'application/vnd.ms-powerpoint') {
    return true
  }

  return false
}

import 'server-only'
import sharp from 'sharp'

/**
 * Long-edge cap for photos larger than typical phone cameras.
 * Downscale only above this; 5120px is beyond normal viewing/print for claim evidence.
 */
const MAX_LONG_EDGE = 5120

/** Near-lossless JPEG — high quality, full chroma (no 4:2:0 subsampling). */
const JPEG_OPTIONS = {
  quality: 95,
  mozjpeg: true,
  chromaSubsampling: '4:4:4' as const,
}

/** Lossless PNG re-pack (smaller files, identical pixels). */
const PNG_OPTIONS = {
  compressionLevel: 9,
  adaptiveFiltering: true,
}

const HEIC_TYPES = new Set([
  'image/heic',
  'image/heif',
  'image/heic-sequence',
  'image/heif-sequence',
])

export type CompressedEvidence = {
  buffer: Buffer
  fileName: string
  mimeType: string
  originalBytes: number
  storedBytes: number
}

function extension(name: string): string {
  const i = name.lastIndexOf('.')
  return i >= 0 ? name.slice(i).toLowerCase() : ''
}

function baseName(name: string): string {
  const i = name.lastIndexOf('.')
  return i >= 0 ? name.slice(0, i) : name
}

function withExtension(name: string, ext: string): string {
  const extNorm = ext.startsWith('.') ? ext : `.${ext}`
  return `${baseName(name)}${extNorm}`
}

export function isCompressibleEvidenceImage(
  mimeType: string,
  fileName: string
): boolean {
  const mime = (mimeType || '').toLowerCase()
  const ext = extension(fileName)

  if (HEIC_TYPES.has(mime) || ext === '.heic' || ext === '.heif') return true
  if (mime === 'image/jpeg' || mime === 'image/jpg' || ext === '.jpg' || ext === '.jpeg') {
    return true
  }
  if (mime === 'image/png' || ext === '.png') return true
  if (mime === 'image/webp' || ext === '.webp') return true

  return false
}

/**
 * Optimize images for storage without visible quality loss:
 * - HEIC/HEIF (iPhone) → high-quality JPEG
 * - JPEG → high-quality re-encode (often smaller from camera bloat)
 * - PNG → lossless deflate optimization (document screenshots)
 * - WebP → high-quality WebP
 * Returns null to keep the original bytes when compression would not help.
 */
export async function compressEvidenceImage(
  file: File
): Promise<CompressedEvidence | null> {
  if (!isCompressibleEvidenceImage(file.type, file.name)) {
    return null
  }

  const originalBytes = file.size
  const input = Buffer.from(await file.arrayBuffer())

  let pipeline = sharp(input, { failOn: 'none' }).rotate()

  const meta = await pipeline.metadata()
  const width = meta.width ?? 0
  const height = meta.height ?? 0

  if (width > 0 && height > 0 && Math.max(width, height) > MAX_LONG_EDGE) {
    pipeline = pipeline.resize(MAX_LONG_EDGE, MAX_LONG_EDGE, {
      fit: 'inside',
      withoutEnlargement: true,
    })
  }

  const mime = (file.type || '').toLowerCase()
  const ext = extension(file.name)
  const isHeic =
    HEIC_TYPES.has(mime) || ext === '.heic' || ext === '.heif'
  const isPng = mime === 'image/png' || ext === '.png'
  const isWebp = mime === 'image/webp' || ext === '.webp'

  let buffer: Buffer
  let fileName: string
  let mimeType: string

  if (isHeic) {
    buffer = await pipeline.jpeg(JPEG_OPTIONS).toBuffer()
    fileName = withExtension(file.name, '.jpg')
    mimeType = 'image/jpeg'
  } else if (isPng) {
    buffer = await pipeline.png(PNG_OPTIONS).toBuffer()
    fileName = file.name
    mimeType = 'image/png'
  } else if (isWebp) {
    buffer = await pipeline.webp({ quality: 95, effort: 4 }).toBuffer()
    fileName = file.name
    mimeType = 'image/webp'
  } else {
    buffer = await pipeline.jpeg(JPEG_OPTIONS).toBuffer()
    fileName =
      ext === '.jpg' || ext === '.jpeg'
        ? file.name
        : withExtension(file.name, '.jpg')
    mimeType = 'image/jpeg'
  }

  const storedBytes = buffer.length

  // Always convert HEIC/HEIF so storage and browsers get JPEG, even if slightly larger.
  if (!isHeic && storedBytes >= originalBytes) {
    return null
  }

  return {
    buffer,
    fileName,
    mimeType,
    originalBytes,
    storedBytes,
  }
}

export function fileFromCompressed(
  compressed: CompressedEvidence,
  displayName?: string
): File {
  const name = displayName || compressed.fileName
  const blob = new Blob([new Uint8Array(compressed.buffer)], {
    type: compressed.mimeType,
  })
  return new File([blob], name, { type: compressed.mimeType })
}

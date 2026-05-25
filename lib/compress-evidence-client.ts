import { inferUploadMimeType } from '@/lib/file-meta'
import { VERCEL_SAFE_UPLOAD_BYTES } from '@/lib/upload-limits'

const MAX_LONG_EDGE = 2560

function isBrowserImage(mime: string, name: string): boolean {
  if (mime.startsWith('image/') && mime !== 'image/gif') return true
  return /\.(jpe?g|png|webp|heic|heif)$/i.test(name)
}

function scaleToMaxEdge(width: number, height: number, maxEdge: number) {
  if (width <= maxEdge && height <= maxEdge) {
    return { width, height }
  }
  if (width >= height) {
    const w = maxEdge
    return { width: w, height: Math.round((height / width) * w) }
  }
  const h = maxEdge
  return { width: Math.round((width / height) * h), height: h }
}

/**
 * Shrink photos in the browser before POST so Vercel (~4.5 MB body limit)
 * does not return "request entity too large".
 */
export async function prepareEvidenceFileForUpload(
  file: File,
  maxBytes = VERCEL_SAFE_UPLOAD_BYTES
): Promise<File> {
  if (typeof document === 'undefined') return file

  const mime = inferUploadMimeType(file)
  if (!isBrowserImage(mime, file.name)) {
    return file
  }

  if (file.size <= maxBytes && mime === 'image/jpeg') {
    return file
  }

  try {
    const bitmap = await createImageBitmap(file)
    const { width, height } = scaleToMaxEdge(
      bitmap.width,
      bitmap.height,
      MAX_LONG_EDGE
    )

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      bitmap.close()
      return file
    }

    ctx.drawImage(bitmap, 0, 0, width, height)
    bitmap.close()

    let quality = 0.92
    let blob: Blob | null = null

    for (let attempt = 0; attempt < 8; attempt++) {
      blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/jpeg', quality)
      })
      if (blob && blob.size <= maxBytes) break
      quality -= 0.1
    }

    if (!blob) return file

    if (blob.size >= file.size && file.size <= maxBytes) {
      return file
    }

    const base = file.name.replace(/\.[^.]+$/, '') || 'photo'
    const name = `${base}.jpg`
    return new File([blob], name, { type: 'image/jpeg' })
  } catch (err) {
    console.warn('Client image prepare failed:', err)
    if (file.size > maxBytes) {
      throw new Error(
        `Photo is too large (${Math.round(file.size / (1024 * 1024))} MB) to upload from this device. Try again with less zoom or use a smaller image.`
      )
    }
    return file
  }
}

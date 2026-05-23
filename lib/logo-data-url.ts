import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

let cached: string | null = null

/** Base64 data URL for public/logo-icon.png (book only — tab / PWA icons). */
export async function getLogoIconDataUrl(): Promise<string> {
  if (!cached) {
    const buf = await readFile(join(process.cwd(), 'public', 'logo-icon.png'))
    cached = `data:image/png;base64,${buf.toString('base64')}`
  }
  return cached
}

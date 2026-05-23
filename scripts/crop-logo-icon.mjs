/**
 * Crops the book icon (no wordmark) from public/logo.png → public/logo-icon.png
 * Tune CROP_* if you replace the master logo art.
 */
import sharp from 'sharp'
import { existsSync } from 'fs'

const input = 'public/logo.png'
const output = 'public/logo-icon.png'

if (!existsSync(input)) {
  console.error(`Missing ${input}`)
  process.exit(1)
}

const meta = await sharp(input).metadata()
const size = meta.width ?? 1254

// Square crop: book + arrow only (excludes "LedgerStack" text below)
const cropSize = Math.round(size * 0.62)
const left = Math.round((size - cropSize) / 2)
const top = Math.round(size * 0.06)

await sharp(input)
  .extract({ left, top, width: cropSize, height: cropSize })
  .png({ compressionLevel: 9 })
  .toFile(output)

console.log(`Wrote ${output} (${cropSize}×${cropSize} from ${size}×${size}, top=${top})`)

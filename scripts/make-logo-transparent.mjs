/**
 * Removes near-black background from public/logo.png (or any input).
 * Usage: node scripts/make-logo-transparent.mjs [input] [output]
 */
import sharp from 'sharp'
import { existsSync } from 'fs'

const input = process.argv[2] || 'public/logo-source.png'
const output = process.argv[3] || 'public/logo.png'
const threshold = Number(process.argv[4] || 48)

if (!existsSync(input)) {
  console.error(`Missing file: ${input}`)
  process.exit(1)
}

const { data, info } = await sharp(input)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true })

for (let i = 0; i < data.length; i += 4) {
  const r = data[i]
  const g = data[i + 1]
  const b = data[i + 2]
  // Dark background + dark book pages — keep green/white highlights
  if (r <= threshold && g <= threshold && b <= threshold) {
    data[i + 3] = 0
  }
}

await sharp(data, {
  raw: {
    width: info.width,
    height: info.height,
    channels: 4,
  },
})
  .png({ compressionLevel: 9 })
  .toFile(output)

console.log(`Wrote ${output} (${info.width}x${info.height}, threshold<=${threshold})`)

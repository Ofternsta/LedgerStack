/** Client + server safe file helpers (no pdf-parse / server-only). */
export function describeFile(file: { name: string; size: number; type: string }) {
  const sizeKb = Math.max(1, Math.round(file.size / 1024))
  const type = file.type || 'unknown type'
  return `${file.name} (${sizeKb} KB, ${type})`
}

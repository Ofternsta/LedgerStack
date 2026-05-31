/** Replace Unicode punctuation that breaks Helvetica PDF rendering. */
export function normalizePdfCharacters(text: string): string {
  return text
    .normalize('NFKC')
    .replace(/\u2192/g, ' to ')
    .replace(/\u2013|\u2014/g, '-')
    .replace(/[\u2018\u2019\u2032]/g, "'")
    .replace(/[\u201C\u201D\u2033]/g, '"')
    .replace(/\u00A0/g, ' ')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
}

/**
 * Repair text where each letter was separated by spaces (common in garbled AI output).
 * "S t a t u s  u p d a t e d" -> "Status updated"
 */
export function collapseLetterSpacing(text: string): string {
  let prev = ''
  let current = text
  for (let i = 0; i < 24; i++) {
    prev = current
    current = current.replace(
      /([A-Za-z0-9]) (?=[A-Za-z0-9](?: |$))/g,
      '$1'
    )
    if (current === prev) break
  }
  return current.replace(/ {2,}/g, ' ').trim()
}

export function sanitizeReportText(text: string): string {
  return collapseLetterSpacing(normalizePdfCharacters(text))
}

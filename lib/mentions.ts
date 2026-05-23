/** Mention token inserted in note body: @[Display Name](userId) */
const MENTION_PATTERN = /@\[([^\]]+)\]\(([0-9a-f-]{36})\)/gi

export function extractMentionedUserIds(body: string): string[] {
  const ids = new Set<string>()
  let match: RegExpExecArray | null
  const re = new RegExp(MENTION_PATTERN.source, 'gi')
  while ((match = re.exec(body)) !== null) {
    ids.add(match[2])
  }
  return [...ids]
}

export function renderMentionBody(body: string): string {
  return body.replace(
    MENTION_PATTERN,
    '<span class="font-semibold text-blue-800">@$1</span>'
  )
}

export type TeamMemberOption = {
  id: string
  label: string
  role: string
}

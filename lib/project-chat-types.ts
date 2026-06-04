export type ProjectChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

export type ProjectChatCitation = {
  doc_ref: string
  claim_id: string
  file_name: string
  excerpt: string
}

export type ProjectChatReply = {
  reply: string
  citations: ProjectChatCitation[]
  refused: boolean
}

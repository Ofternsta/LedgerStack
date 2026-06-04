import 'server-only'

import {
  formatProjectChatPrompt,
  type ProjectChatContext,
} from '@/lib/gather-project-chat-context'
import { GROQ_TEXT_MODEL } from '@/lib/groq-models'
import type {
  ProjectChatMessage,
  ProjectChatReply,
} from '@/lib/project-chat-types'

const SYSTEM_PROMPT = `You are LedgerStack project assistant. You ONLY help with THIS project using the data provided.

STRICT RULES:
- Answer only questions about this project (jobs, documents, timeline, notes, messages, schedule, status, files).
- If the user asks anything unrelated (general knowledge, other projects, coding, jokes, legal advice, etc.), set refused=true and reply briefly that you can only discuss this project.
- Use ONLY facts from the project data. If unknown, say you do not see that in the project files.
- When using document text, add an entry to citations with the exact doc_ref, claim_id, file_name, and a short excerpt (under 200 chars) showing what you used.
- In reply text, mention the file name when citing a document.
- Be concise and practical for contractors.
- Return JSON only:
{
  "reply": "string",
  "citations": [{ "doc_ref": "...", "claim_id": "...", "file_name": "...", "excerpt": "..." }],
  "refused": false
}`

function sanitizeMessages(messages: ProjectChatMessage[]): ProjectChatMessage[] {
  return messages
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .slice(-16)
    .map((m) => ({
      role: m.role,
      content: String(m.content || '').slice(0, 4000).trim(),
    }))
    .filter((m) => m.content.length > 0)
}

function validCitation(
  raw: unknown,
  ctx: ProjectChatContext
): raw is {
  doc_ref: string
  claim_id: string
  file_name: string
  excerpt: string
} {
  if (!raw || typeof raw !== 'object') return false
  const c = raw as Record<string, unknown>
  const docRef = String(c.doc_ref || '').trim()
  if (!docRef) return false
  const doc = ctx.documents.find((d) => d.doc_ref === docRef)
  if (!doc) return false
  return true
}

export async function generateProjectChatReply(
  ctx: ProjectChatContext,
  messages: ProjectChatMessage[]
): Promise<ProjectChatReply> {
  const history = sanitizeMessages(messages)
  if (!history.length) {
    return {
      reply: 'Ask a question about this project.',
      citations: [],
      refused: false,
    }
  }

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    return {
      reply:
        'AI chat is not configured. Add GROQ_API_KEY to enable project assistant.',
      citations: [],
      refused: false,
    }
  }

  const dataBlock = formatProjectChatPrompt(ctx)

  try {
    const { default: Groq } = await import('groq-sdk')
    const groq = new Groq({ apiKey })

    const completion = await groq.chat.completions.create({
      model: GROQ_TEXT_MODEL,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Project data:\n\n${dataBlock}`,
        },
        ...history.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      ],
    })

    const raw = completion.choices?.[0]?.message?.content?.trim()
    if (!raw) {
      return {
        reply: 'No response from AI. Try again.',
        citations: [],
        refused: false,
      }
    }

    const parsed = JSON.parse(raw) as {
      reply?: string
      citations?: unknown[]
      refused?: boolean
    }

    const citations = (parsed.citations || [])
      .filter((c) => validCitation(c, ctx))
      .map((c) => {
        const row = c as {
          doc_ref: string
          claim_id: string
          file_name: string
          excerpt: string
        }
        const doc = ctx.documents.find((d) => d.doc_ref === row.doc_ref)!
        return {
          doc_ref: doc.doc_ref,
          claim_id: doc.claim_id,
          file_name: doc.file_name,
          excerpt: String(row.excerpt || doc.summary || '').slice(0, 280),
        }
      })

    return {
      reply: String(parsed.reply || '').trim() || 'No answer generated.',
      citations,
      refused: Boolean(parsed.refused),
    }
  } catch (err) {
    console.error('Project AI chat failed:', err)
    return {
      reply: 'Could not get an answer. Please try again.',
      citations: [],
      refused: false,
    }
  }
}

'use client'

import { useEffect, useRef, useState } from 'react'
import { LegalNotice } from '@/components/legal-notice'
import { isUnlimited } from '@/lib/plan-entitlements'
import type {
  ProjectChatCitation,
  ProjectChatMessage,
} from '@/lib/project-chat-types'

type ChatTurn = ProjectChatMessage & {
  citations?: ProjectChatCitation[]
}

type ProjectAiChatProps = {
  projectId: string
  aiSummariesLimit: number
  aiSummariesUsed: number
  onNavigateToDocument: (claimId: string, filePath: string) => void
  onUsageUpdated?: () => void
}

export function ProjectAiChat({
  projectId,
  aiSummariesLimit,
  aiSummariesUsed,
  onNavigateToDocument,
  onUsageUpdated,
}: ProjectAiChatProps) {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [turns, setTurns] = useState<ChatTurn[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const aiAtLimit =
    !isUnlimited(aiSummariesLimit) && aiSummariesUsed >= aiSummariesLimit

  useEffect(() => {
    if (open && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [open, turns, loading])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  async function sendMessage(e?: React.FormEvent) {
    e?.preventDefault()
    const text = input.trim()
    if (!text || loading || aiAtLimit) return

    const userTurn: ChatTurn = { role: 'user', content: text }
    const nextTurns = [...turns, userTurn]
    setTurns(nextTurns)
    setInput('')
    setLoading(true)
    setError(null)

    const res = await fetch('/api/project-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_id: projectId,
        messages: nextTurns.map(({ role, content }) => ({ role, content })),
      }),
    })
    const payload = await res.json().catch(() => ({}))
    setLoading(false)

    if (!res.ok) {
      setError(payload.error || 'Could not get a reply')
      setTurns(turns)
      return
    }

    setTurns([
      ...nextTurns,
      {
        role: 'assistant',
        content: String(payload.reply || ''),
        citations: Array.isArray(payload.citations) ? payload.citations : [],
      },
    ])
    onUsageUpdated?.()
  }

  function clearChat() {
    setTurns([])
    setError(null)
  }

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 sm:bg-transparent sm:pointer-events-none"
          aria-hidden
          onClick={() => setOpen(false)}
        />
      )}

      <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2 safe-bottom safe-x pointer-events-none">
        {open && (
          <div
            className="pointer-events-auto w-[min(100vw-2rem,24rem)] sm:w-96 h-[min(70vh,32rem)] flex flex-col border border-border rounded-2xl shadow-xl bg-surface-elevated overflow-hidden"
            role="dialog"
            aria-label="Project AI chat"
          >
            <header className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border bg-surface shrink-0">
              <div>
                <h2 className="font-bold text-sm text-foreground">Project AI</h2>
                <p className="text-[11px] text-muted">This project only</p>
              </div>
              <div className="flex items-center gap-1">
                {turns.length > 0 && (
                  <button
                    type="button"
                    onClick={clearChat}
                    className="text-xs text-muted px-2 py-1 rounded-lg hover:bg-surface min-h-[36px]"
                  >
                    Clear
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="text-sm text-muted px-2 py-1 rounded-lg hover:bg-surface min-h-[36px]"
                  aria-label="Close chat"
                >
                  ✕
                </button>
              </div>
            </header>

            {!isUnlimited(aiSummariesLimit) && (
              <p className="text-[11px] text-muted px-4 py-1.5 border-b border-border shrink-0">
                AI this month: {aiSummariesUsed} / {aiSummariesLimit}
              </p>
            )}

            <div
              ref={listRef}
              className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0"
            >
              {turns.length === 0 && !loading && (
                <p className="text-sm text-muted-dim">
                  Ask about documents, job status, timeline, notes, or schedule
                  for this project.
                </p>
              )}

              {turns.map((turn, i) => (
                <div
                  key={`${turn.role}-${i}`}
                  className={
                    turn.role === 'user' ? 'flex justify-end' : 'flex justify-start'
                  }
                >
                  <div
                    className={`max-w-[92%] rounded-xl px-3 py-2 text-sm ${
                      turn.role === 'user'
                        ? 'bg-brand text-[#052e16]'
                        : 'bg-surface border border-border text-foreground'
                    }`}
                  >
                    <p className="whitespace-pre-wrap leading-relaxed">
                      {turn.content}
                    </p>
                    {turn.role === 'assistant' &&
                      turn.citations &&
                      turn.citations.length > 0 && (
                        <ul className="mt-2 pt-2 border-t border-border space-y-1.5">
                          {turn.citations.map((cite) => (
                            <li key={`${cite.doc_ref}-${i}`}>
                              <button
                                type="button"
                                onClick={() =>
                                  onNavigateToDocument(
                                    cite.claim_id,
                                    cite.doc_ref
                                  )
                                }
                                className="w-full text-left text-xs rounded-lg border border-border bg-surface-elevated px-2 py-1.5 hover:border-brand-dim/50 min-h-[40px]"
                              >
                                <span className="font-medium text-brand-bright block truncate">
                                  {cite.file_name}
                                </span>
                                {cite.excerpt && (
                                  <span className="text-muted-dim line-clamp-2 mt-0.5">
                                    {cite.excerpt}
                                  </span>
                                )}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                  </div>
                </div>
              ))}

              {loading && (
                <p className="text-sm text-muted-dim animate-pulse">Thinking…</p>
              )}

              {error && (
                <p className="text-sm alert-error rounded-lg p-2">{error}</p>
              )}
            </div>

            <form
              onSubmit={(e) => void sendMessage(e)}
              className="shrink-0 border-t border-border p-3 space-y-2 bg-surface"
            >
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    void sendMessage()
                  }
                }}
                rows={2}
                placeholder="Ask about this project…"
                disabled={loading || aiAtLimit}
                className="w-full border border-border rounded-xl p-2.5 text-sm bg-surface-elevated resize-none disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={loading || aiAtLimit || !input.trim()}
                className="w-full btn-primary py-2.5 rounded-xl text-sm font-medium disabled:opacity-50 min-h-[44px]"
              >
                {aiAtLimit ? 'AI limit reached' : loading ? 'Sending…' : 'Send'}
              </button>
              <LegalNotice id="ai" className="text-[10px]" />
            </form>
          </div>
        )}

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="pointer-events-auto h-14 w-14 rounded-full btn-primary shadow-lg flex items-center justify-center text-[#052e16] font-bold text-sm min-h-[56px] min-w-[56px]"
          aria-expanded={open}
          aria-label={open ? 'Close project AI chat' : 'Open project AI chat'}
        >
          {open ? '✕' : 'AI'}
        </button>
      </div>
    </>
  )
}

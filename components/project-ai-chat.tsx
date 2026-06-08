'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
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

const LAUNCHER_BUTTON_CLASS =
  'relative flex items-center justify-center w-[4.125rem] h-[4.125rem] rounded-full border border-border bg-surface-elevated text-brand-bright hover:bg-surface shadow-sm'

function RobotIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 3v2M15 3v2M9.5 17h5M7 8h10a2 2 0 012 2v6a2 2 0 01-2 2H7a2 2 0 01-2-2v-6a2 2 0 012-2z"
      />
      <circle cx="9.5" cy="12.5" r="0.75" fill="currentColor" stroke="none" />
      <circle cx="14.5" cy="12.5" r="0.75" fill="currentColor" stroke="none" />
      <path strokeLinecap="round" d="M12 8V5.5" />
      <circle cx="12" cy="4.25" r="0.85" fill="currentColor" stroke="none" />
      <path strokeLinecap="round" d="M5 11H3.5M20.5 11H19" />
    </svg>
  )
}

export function ProjectAiChat({
  projectId,
  aiSummariesLimit,
  aiSummariesUsed,
  onNavigateToDocument,
  onUsageUpdated,
}: ProjectAiChatProps) {
  const [mounted, setMounted] = useState(false)
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
    setMounted(true)
  }, [])

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

  function closePanel() {
    setOpen(false)
  }

  if (!mounted) return null

  return createPortal(
    <>
      <div className="fixed z-[78] bottom-[max(env(safe-area-inset-bottom,0px),0.75rem)] right-3 pointer-events-none flex flex-col items-end gap-2">
        {open && (
          <div
            className="pointer-events-auto w-[min(calc(100vw-1.5rem),32rem)] sm:w-[36rem] h-[min(85vh,42rem)] flex flex-col border border-border rounded-2xl shadow-xl bg-surface-elevated overflow-hidden mb-1"
            role="dialog"
            aria-label="Project AI chat"
          >
            <header className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border bg-surface shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="flex items-center justify-center w-8 h-8 rounded-full border border-border bg-surface-elevated text-brand-bright shrink-0">
                  <RobotIcon className="w-4 h-4" />
                </span>
                <div className="min-w-0">
                  <h2 className="font-bold text-sm text-foreground truncate">
                    Project AI
                  </h2>
                  <p className="text-[11px] text-muted truncate">
                    This project only
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
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
                  onClick={closePanel}
                  className="text-sm text-muted px-2 py-1 rounded-lg hover:bg-surface min-h-[36px]"
                  aria-label="Close chat"
                >
                  Close
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

        <div className="pointer-events-auto">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className={LAUNCHER_BUTTON_CLASS}
            aria-expanded={open}
            aria-label={open ? 'Close project AI chat' : 'Open project AI chat'}
            title="Project AI"
          >
            <RobotIcon className="w-[1.875rem] h-[1.875rem]" />
          </button>
        </div>
      </div>

      {open && (
        <button
          type="button"
          className="fixed inset-0 z-[77] bg-black/40 sm:bg-transparent sm:pointer-events-none"
          aria-label="Close project AI chat"
          onClick={closePanel}
        />
      )}
    </>,
    document.body
  )
}

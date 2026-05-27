'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { ConversationMessage } from '@/lib/conversation-types'

type ConversationRow = {
  id: string
  conversation_type: 'direct' | 'group'
  title: string
  last_message_at: string
  last_message_preview: string | null
}

type RosterMember = {
  id: string
  full_name: string | null
  role: string
  label: string
}

type MessagingLauncherProps = {
  currentUserId: string | null
  canSend: boolean
}

function ChatIcon({ className }: { className?: string }) {
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
        d="M8 10h8M8 14h5M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4-.8L3 20l1.2-3.6C3.45 15.1 3 13.6 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
      />
    </svg>
  )
}

export function MessagingLauncher({
  currentUserId,
  canSend,
}: MessagingLauncherProps) {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<'list' | 'compose' | 'thread'>('list')
  const [conversations, setConversations] = useState<ConversationRow[]>([])
  const [roster, setRoster] = useState<RosterMember[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [groupTitle, setGroupTitle] = useState('')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [activeTitle, setActiveTitle] = useState('')
  const [messages, setMessages] = useState<ConversationMessage[]>([])
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const loadConversations = useCallback(async () => {
    const res = await fetch('/api/conversations')
    const payload = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(
        payload.error ||
          'Could not load chats. Run supabase/chat-conversations.sql in Supabase.'
      )
      return
    }
    setError(null)
    setConversations(payload.conversations || [])
  }, [])

  const loadRoster = useCallback(async () => {
    const res = await fetch('/api/team/roster')
    const payload = await res.json().catch(() => ({}))
    if (res.ok) {
      const list = (payload.roster || []) as RosterMember[]
      setRoster(list.filter((m) => m.id !== currentUserId))
    }
  }, [currentUserId])

  const loadMessages = useCallback(async (conversationId: string) => {
    const res = await fetch(
      `/api/conversations/${encodeURIComponent(conversationId)}/messages`
    )
    const payload = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(payload.error || 'Could not load messages')
      return
    }
    setError(null)
    setMessages(payload.messages || [])
    const list = listRef.current
    if (list) {
      requestAnimationFrame(() => {
        list.scrollTop = list.scrollHeight
      })
    }
  }, [])

  useEffect(() => {
    if (!open) return
    setLoading(true)
    Promise.all([loadConversations(), loadRoster()]).finally(() =>
      setLoading(false)
    )
  }, [open, loadConversations, loadRoster])

  useEffect(() => {
    if (!open || view !== 'thread' || !activeId) return
    loadMessages(activeId)
    const interval = setInterval(() => loadMessages(activeId), 12000)
    return () => clearInterval(interval)
  }, [open, view, activeId, loadMessages])

  function openThread(conv: ConversationRow) {
    setActiveId(conv.id)
    setActiveTitle(conv.title)
    setView('thread')
    setDraft('')
  }

  async function startCompose() {
    setView('compose')
    setSelected(new Set())
    setGroupTitle('')
    setError(null)
    await loadRoster()
  }

  async function createChat() {
    if (!selected.size) {
      setError('Select at least one person.')
      return
    }
    if (selected.size > 1 && !groupTitle.trim()) {
      setError('Name your group chat.')
      return
    }

    setSending(true)
    setError(null)
    const res = await fetch('/api/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        participant_ids: [...selected],
        title: groupTitle.trim(),
      }),
    })
    const payload = await res.json().catch(() => ({}))
    setSending(false)

    if (!res.ok) {
      setError(payload.error || 'Could not start chat')
      return
    }

    await loadConversations()
    const id = payload.conversation_id as string
    const title =
      selected.size === 1
        ? roster.find((m) => m.id === [...selected][0])?.label || 'Chat'
        : groupTitle.trim()

    setActiveId(id)
    setActiveTitle(title)
    setView('thread')
    setDraft('')
    await loadMessages(id)
  }

  async function sendMessage() {
    if (!draft.trim() || !activeId || !canSend) return
    setSending(true)
    setError(null)
    const res = await fetch(
      `/api/conversations/${encodeURIComponent(activeId)}/messages`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: draft.trim() }),
      }
    )
    const payload = await res.json().catch(() => ({}))
    setSending(false)

    if (!res.ok) {
      setError(payload.error || 'Could not send')
      return
    }

    setDraft('')
    await loadMessages(activeId)
    await loadConversations()
  }

  function toggleMember(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function closePanel() {
    setOpen(false)
    setView('list')
    setActiveId(null)
    setError(null)
  }

  const isGroupCompose = selected.size > 1

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="relative flex items-center justify-center w-11 h-11 rounded-full border border-border bg-surface-elevated text-brand-bright hover:bg-surface shadow-sm"
        aria-label="Open messages"
        title="Messages"
      >
        <ChatIcon className="w-5 h-5" />
      </button>

      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[90] bg-black/40"
            aria-label="Close messages"
            onClick={closePanel}
          />
          <aside
            className="fixed z-[100] top-0 right-0 h-dvh w-full max-w-md flex flex-col bg-background border-l border-border shadow-2xl safe-top safe-bottom"
            role="dialog"
            aria-label="Messages"
          >
            <header className="shrink-0 border-b border-border px-4 py-3 flex items-center gap-2">
              {view !== 'list' ? (
                <button
                  type="button"
                  onClick={() => {
                    if (view === 'thread') {
                      setView('list')
                      setActiveId(null)
                      loadConversations()
                    } else {
                      setView('list')
                    }
                  }}
                  className="text-sm text-brand-bright font-medium min-h-[44px] px-1"
                >
                  ← Back
                </button>
              ) : (
                <h2 className="font-bold text-lg text-white flex-1">Messages</h2>
              )}
              {view === 'thread' && (
                <h2 className="font-bold text-base text-white flex-1 truncate">
                  {activeTitle}
                </h2>
              )}
              {view === 'compose' && (
                <h2 className="font-bold text-base text-white flex-1">New chat</h2>
              )}
              <button
                type="button"
                onClick={closePanel}
                className="text-sm text-muted min-h-[44px] px-2"
              >
                Close
              </button>
            </header>

            {error && (
              <p className="mx-4 mt-2 text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg p-2">
                {error}
              </p>
            )}

            {view === 'list' && (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="px-4 py-2">
                  <button
                    type="button"
                    disabled={!canSend}
                    onClick={startCompose}
                    className="w-full btn-primary text-[#052e16] py-3 rounded-xl font-medium text-sm min-h-[48px] disabled:opacity-50"
                  >
                    New message or group
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
                  {loading && (
                    <p className="text-sm text-muted-dim text-center py-6">
                      Loading…
                    </p>
                  )}
                  {!loading && conversations.length === 0 && (
                    <p className="text-sm text-muted-dim text-center py-6">
                      No chats yet. Start a conversation with a teammate.
                    </p>
                  )}
                  {conversations.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => openThread(c)}
                      className="w-full text-left border border-border rounded-xl p-3 bg-surface-elevated hover:bg-surface"
                    >
                      <p className="font-medium text-sm text-foreground truncate">
                        {c.title}
                        {c.conversation_type === 'group' && (
                          <span className="text-xs text-muted-dim ml-1">
                            (group)
                          </span>
                        )}
                      </p>
                      {c.last_message_preview && (
                        <p className="text-xs text-muted-dim mt-1 truncate">
                          {c.last_message_preview}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {view === 'compose' && (
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
                <p className="text-sm text-muted">
                  Select one person for a direct message, or several for a group
                  only they can see.
                </p>
                {isGroupCompose && (
                  <input
                    className="input-field w-full text-sm"
                    placeholder="Group name"
                    value={groupTitle}
                    onChange={(e) => setGroupTitle(e.target.value)}
                  />
                )}
                <ul className="space-y-1 border border-border rounded-xl p-2 max-h-[50vh] overflow-y-auto">
                  {roster.map((m) => (
                    <li key={m.id}>
                      <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selected.has(m.id)}
                          onChange={() => toggleMember(m.id)}
                        />
                        <span className="text-sm text-foreground">
                          {m.label}
                          <span className="text-xs text-muted-dim ml-1">
                            ({m.role === 'admin' ? 'Admin' : 'Worker'})
                          </span>
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  disabled={sending || !selected.size}
                  onClick={createChat}
                  className="w-full btn-primary text-[#052e16] py-3 rounded-xl font-medium disabled:opacity-50"
                >
                  {sending ? 'Starting…' : 'Start chat'}
                </button>
              </div>
            )}

            {view === 'thread' && activeId && (
              <div className="flex-1 flex flex-col min-h-0">
                <div
                  ref={listRef}
                  className="flex-1 overflow-y-auto px-4 py-3 space-y-3"
                >
                  {messages.map((m) => {
                    const mine = m.sender_id === currentUserId
                    return (
                      <div
                        key={m.id}
                        className={`flex ${mine ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-xl px-3 py-2 ${
                            mine
                              ? 'btn-primary text-[#052e16]'
                              : 'bg-surface-elevated border border-border text-foreground'
                          }`}
                        >
                          <p
                            className={`text-xs font-medium mb-1 ${
                              mine ? 'text-[#052e16]/70' : 'text-muted-dim'
                            }`}
                          >
                            {m.sender_label}
                          </p>
                          <p className="text-sm whitespace-pre-wrap leading-relaxed">
                            {m.body}
                          </p>
                          <p
                            className={`text-[10px] mt-1 ${
                              mine ? 'text-[#052e16]/60' : 'text-muted-dim'
                            }`}
                          >
                            {new Date(m.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
                {canSend ? (
                  <div className="shrink-0 border-t border-border p-3 flex gap-2">
                    <textarea
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      rows={2}
                      placeholder="Type a message…"
                      className="input-field flex-1 text-sm resize-none"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          sendMessage()
                        }
                      }}
                    />
                    <button
                      type="button"
                      disabled={sending || !draft.trim()}
                      onClick={sendMessage}
                      className="btn-primary text-[#052e16] px-4 rounded-xl text-sm font-medium self-end min-h-[48px] disabled:opacity-50"
                    >
                      Send
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-muted-dim p-3 border-t border-border">
                    You can read messages after admin approval.
                  </p>
                )}
              </div>
            )}
          </aside>
        </>
      )}
    </>
  )
}

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { ConversationMessage } from '@/lib/conversation-types'

type ConversationRow = {
  id: string
  conversation_type: 'direct' | 'group'
  title: string
  last_message_at: string
  last_message_preview: string | null
  unread_count: number
}

type UnreadSummary = {
  total_unread_messages: number
  unread_conversation_count: number
}

type RosterMember = {
  id: string
  full_name: string | null
  role: string
  label: string
  display_label?: string
  role_label?: string
}

type MessagingLauncherProps = {
  currentUserId: string | null
  canSend: boolean
}

const POLL_CLOSED_MS = 15000
const POLL_THREAD_MS = 12000

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

function formatBadgeCount(count: number): string {
  if (count > 99) return '99+'
  return String(count)
}

function UnreadDot({ className }: { className?: string }) {
  return (
    <span
      className={`absolute w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-background ${className ?? ''}`}
      aria-hidden
    />
  )
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
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
  const [unread, setUnread] = useState<UnreadSummary>({
    total_unread_messages: 0,
    unread_conversation_count: 0,
  })
  const [roster, setRoster] = useState<RosterMember[]>([])
  const [composeMemberIds, setComposeMemberIds] = useState<Set<string>>(new Set())
  const [markedChatIds, setMarkedChatIds] = useState<Set<string>>(new Set())
  const [groupTitle, setGroupTitle] = useState('')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [activeTitle, setActiveTitle] = useState('')
  const [messages, setMessages] = useState<ConversationMessage[]>([])
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const activeIdRef = useRef<string | null>(null)

  useEffect(() => {
    activeIdRef.current = activeId
  }, [activeId])

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
    const list = (payload.conversations || []) as ConversationRow[]
    setConversations(list)
    setUnread(
      payload.unread || {
        total_unread_messages: list.reduce((n, c) => n + (c.unread_count || 0), 0),
        unread_conversation_count: list.filter((c) => c.unread_count > 0).length,
      }
    )
  }, [])

  const markRead = useCallback(async (conversationId: string) => {
    await fetch(`/api/conversations/${encodeURIComponent(conversationId)}/read`, {
      method: 'POST',
    })
    setConversations((prev) => {
      let removed = 0
      let hadUnread = false
      const next = prev.map((c) => {
        if (c.id === conversationId && c.unread_count > 0) {
          removed = c.unread_count
          hadUnread = true
          return { ...c, unread_count: 0 }
        }
        return c
      })
      if (hadUnread) {
        setUnread((u) => ({
          total_unread_messages: Math.max(0, u.total_unread_messages - removed),
          unread_conversation_count: Math.max(0, u.unread_conversation_count - 1),
        }))
      }
      return next
    })
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
    if (activeIdRef.current === conversationId) {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId ? { ...c, unread_count: 0 } : c
        )
      )
    }
    const list = listRef.current
    if (list) {
      requestAnimationFrame(() => {
        list.scrollTop = list.scrollHeight
      })
    }
  }, [])

  useEffect(() => {
    void loadConversations()
    const interval = setInterval(() => {
      if (!open || view === 'list') {
        void loadConversations()
      }
    }, POLL_CLOSED_MS)
    return () => clearInterval(interval)
  }, [loadConversations, open, view])

  useEffect(() => {
    if (!open) return
    setLoading(true)
    Promise.all([loadConversations(), loadRoster()]).finally(() =>
      setLoading(false)
    )
  }, [open, loadConversations, loadRoster])

  useEffect(() => {
    if (!open || view !== 'thread' || !activeId) return
    void loadMessages(activeId)
    const interval = setInterval(() => loadMessages(activeId), POLL_THREAD_MS)
    return () => clearInterval(interval)
  }, [open, view, activeId, loadMessages])

  async function openThread(conv: ConversationRow) {
    setActiveId(conv.id)
    setActiveTitle(conv.title)
    setView('thread')
    setDraft('')
    await markRead(conv.id)
    void loadMessages(conv.id)
  }

  async function startCompose() {
    setView('compose')
    setComposeMemberIds(new Set())
    setGroupTitle('')
    setError(null)
    await loadRoster()
  }

  async function createChat() {
    if (!composeMemberIds.size) {
      setError('Select at least one person.')
      return
    }
    if (composeMemberIds.size > 1 && !groupTitle.trim()) {
      setError('Name your group chat.')
      return
    }

    setSending(true)
    setError(null)
    const res = await fetch('/api/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        participant_ids: [...composeMemberIds],
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
      composeMemberIds.size === 1
        ? roster.find((m) => m.id === [...composeMemberIds][0])?.display_label ||
          roster.find((m) => m.id === [...composeMemberIds][0])?.label ||
          'Chat'
        : groupTitle.trim()

    setActiveId(id)
    setActiveTitle(title)
    setView('thread')
    setDraft('')
    await markRead(id)
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

  function toggleComposeMember(id: string) {
    setComposeMemberIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleMarkChat(conversationId: string) {
    setMarkedChatIds((prev) => {
      const next = new Set(prev)
      if (next.has(conversationId)) next.delete(conversationId)
      else next.add(conversationId)
      return next
    })
  }

  function closePanel() {
    setOpen(false)
    setView('list')
    setActiveId(null)
    setMarkedChatIds(new Set())
    setError(null)
    void loadConversations()
  }

  function backToList() {
    setView('list')
    setActiveId(null)
    void loadConversations()
  }

  async function hideConversation(conversationId: string) {
    const res = await fetch(
      `/api/conversations/${encodeURIComponent(conversationId)}/hide`,
      { method: 'POST' }
    )
    const payload = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error(payload.error || 'Could not remove chat from your list')
    }

    if (activeId === conversationId) {
      setView('list')
      setActiveId(null)
      setActiveTitle('')
      setMessages([])
    }

    setConversations((prev) => {
      const removed = prev.find((c) => c.id === conversationId)
      if (removed?.unread_count) {
        setUnread((u) => ({
          total_unread_messages: Math.max(
            0,
            u.total_unread_messages - removed.unread_count
          ),
          unread_conversation_count: Math.max(
            0,
            u.unread_conversation_count - 1
          ),
        }))
      }
      return prev.filter((c) => c.id !== conversationId)
    })

    setMarkedChatIds((prev) => {
      if (!prev.has(conversationId)) return prev
      const next = new Set(prev)
      next.delete(conversationId)
      return next
    })
  }

  async function deleteMarkedChats() {
    if (markedChatIds.size === 0) return

    const count = markedChatIds.size
    const ok = window.confirm(
      count === 1
        ? 'Remove this chat from your list? Other participants will still see it. It will reappear if someone sends a new message.'
        : `Remove ${count} chats from your list? Other participants will still see them. They will reappear if someone sends a new message.`
    )
    if (!ok) return

    setError(null)
    const ids = [...markedChatIds]
    try {
      for (const id of ids) {
        await hideConversation(id)
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not remove selected chats'
      )
      await loadConversations()
    }
  }

  const totalUnread = unread.total_unread_messages
  const hasUnread = totalUnread > 0
  const isGroupCompose = composeMemberIds.size > 1
  const hasMarkedChats = markedChatIds.size > 0

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="relative flex items-center justify-center w-11 h-11 rounded-full border border-border bg-surface-elevated text-brand-bright hover:bg-surface shadow-sm"
        aria-label={
          hasUnread
            ? `Open messages, ${totalUnread} unread`
            : 'Open messages'
        }
        title={hasUnread ? `${totalUnread} unread message(s)` : 'Messages'}
      >
        <ChatIcon className="w-5 h-5" />
        {hasUnread && (
          <>
            <UnreadDot className="top-0 right-0" />
            <span className="messaging-unread-pulse absolute -top-1 -right-1 min-w-[1.125rem] h-[1.125rem] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
              {formatBadgeCount(totalUnread)}
            </span>
          </>
        )}
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
            <header className="shrink-0 border-b border-border px-4 py-3">
              {view === 'list' ? (
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                  <h2 className="font-bold text-lg text-white justify-self-start">
                    Messages
                  </h2>
                  <div className="justify-self-center flex items-center justify-center w-11 h-11">
                    {hasMarkedChats && (
                      <button
                        type="button"
                        onClick={() => void deleteMarkedChats()}
                        className="flex items-center justify-center w-9 h-9 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                        aria-label={`Delete ${markedChatIds.size} selected chat${markedChatIds.size === 1 ? '' : 's'}`}
                        title={`Delete ${markedChatIds.size} selected chat${markedChatIds.size === 1 ? '' : 's'}`}
                      >
                        <TrashIcon className="w-[1.375rem] h-[1.375rem] shrink-0" />
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={closePanel}
                    className="text-sm text-muted min-h-[44px] px-2 justify-self-end"
                  >
                    Close
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 min-h-[44px]">
                  <button
                    type="button"
                    onClick={() => {
                      if (view === 'thread') backToList()
                      else setView('list')
                    }}
                    className="text-sm text-brand-bright font-medium min-h-[44px] px-1 shrink-0"
                  >
                    ← Back
                  </button>
                  <h2 className="font-bold text-base text-white flex-1 truncate">
                    {view === 'thread' ? activeTitle : 'New chat'}
                  </h2>
                  <button
                    type="button"
                    onClick={closePanel}
                    className="text-sm text-muted min-h-[44px] px-2 shrink-0"
                  >
                    Close
                  </button>
                </div>
              )}
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
                  {conversations.map((c) => {
                    const hasChatUnread = c.unread_count > 0
                    const marked = markedChatIds.has(c.id)
                    return (
                      <div key={c.id} className="relative group">
                        <button
                          type="button"
                          onClick={() => openThread(c)}
                          className={`relative w-full text-left border rounded-xl p-3 pr-12 hover:bg-surface ${
                            marked
                              ? 'border-red-500/50 bg-red-500/5'
                              : hasChatUnread
                                ? 'border-brand-bright/40 bg-surface-elevated'
                                : 'border-border bg-surface-elevated'
                          }`}
                        >
                          {hasChatUnread && !marked && (
                            <>
                              <UnreadDot className="top-2 right-10" />
                              <span className="messaging-unread-pulse absolute top-1.5 right-9 min-w-[1.125rem] h-[1.125rem] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
                                {formatBadgeCount(c.unread_count)}
                              </span>
                            </>
                          )}
                          <p
                            className={`text-sm truncate ${
                              hasChatUnread
                                ? 'font-semibold text-foreground'
                                : 'font-medium text-foreground'
                            }`}
                          >
                            {c.title}
                            {c.conversation_type === 'group' && (
                              <span className="text-xs text-muted-dim ml-1 font-normal">
                                (group)
                              </span>
                            )}
                          </p>
                          {c.last_message_preview && (
                            <p
                              className={`text-xs mt-1 truncate ${
                                hasChatUnread
                                  ? 'text-foreground/90'
                                  : 'text-muted-dim'
                              }`}
                            >
                              {c.last_message_preview}
                            </p>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleMarkChat(c.id)
                          }}
                          className={`absolute top-1/2 -translate-y-1/2 right-3 z-10 w-5 h-5 rounded-full border-2 transition-all ${
                            marked
                              ? 'bg-red-500 border-red-500 opacity-100 scale-100'
                              : 'border-muted-dim bg-surface-elevated opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100 max-sm:opacity-70 max-sm:scale-100'
                          }`}
                          aria-label={
                            marked
                              ? `Unselect ${c.title} for deletion`
                              : `Select ${c.title} for deletion`
                          }
                          aria-pressed={marked}
                        />
                      </div>
                    )
                  })}
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
                          checked={composeMemberIds.has(m.id)}
                          onChange={() => toggleComposeMember(m.id)}
                        />
                        <span className="text-sm text-foreground">
                          {m.display_label || m.label}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  disabled={sending || !composeMemberIds.size}
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

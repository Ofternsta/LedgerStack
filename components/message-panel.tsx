'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export type ChatMessage = {
  id: string
  sender_id: string
  body: string
  created_at: string
  sender_name: string
  sender_role: string
  sender_label: string
}

type MessagePanelProps = {
  channel: 'org_team' | 'project'
  projectId?: string
  currentUserId: string | null
  title: string
  subtitle: string
  canSend: boolean
  readOnlyHint?: string
}

export function MessagePanel({
  channel,
  projectId,
  currentUserId,
  title,
  subtitle,
  canSend,
  readOnlyHint,
}: MessagePanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    const params = new URLSearchParams({ channel })
    if (channel === 'project' && projectId) {
      params.set('project_id', projectId)
    }

    const res = await fetch(`/api/messages?${params}`)
    const payload = await res.json().catch(() => ({}))

    if (!res.ok) {
      setError(payload.error || 'Could not load messages')
      if (payload.error?.includes('relation')) {
        setError(
          'Messages table missing. Run supabase/messaging.sql in Supabase SQL Editor.'
        )
      }
      setLoading(false)
      return
    }

    setError(null)
    setMessages(payload.messages || [])
    setLoading(false)
  }, [channel, projectId])

  useEffect(() => {
    load()
    const interval = setInterval(load, 15000)
    return () => clearInterval(interval)
  }, [load])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send() {
    if (!draft.trim() || !canSend) return

    setSending(true)
    setError(null)

    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel,
        project_id: projectId,
        body: draft.trim(),
      }),
    })

    const payload = await res.json().catch(() => ({}))

    if (!res.ok) {
      setError(payload.error || 'Could not send message')
      setSending(false)
      return
    }

    setDraft('')
    await load()
    setSending(false)
  }

  return (
    <section className="border border-gray-200 rounded-xl p-4 bg-white space-y-3">
      <div>
        <h2 className="font-bold text-lg">{title}</h2>
        <p className="text-sm text-gray-600 mt-1 leading-relaxed">{subtitle}</p>
      </div>

      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg p-2">
          {error}
        </p>
      )}

      <div
        className="border border-gray-100 rounded-xl bg-gray-50 p-3 max-h-[280px] overflow-y-auto space-y-3 min-h-[120px]"
        aria-live="polite"
      >
        {loading && (
          <p className="text-sm text-gray-500 text-center py-4">Loading messages…</p>
        )}

        {!loading && messages.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-4">
            No messages yet. Start the conversation.
          </p>
        )}

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
                    ? 'bg-black text-white'
                    : 'bg-white border border-gray-200 text-gray-900'
                }`}
              >
                <p
                  className={`text-xs font-medium mb-1 ${
                    mine ? 'text-gray-300' : 'text-gray-500'
                  }`}
                >
                  {m.sender_label}
                </p>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {m.body}
                </p>
                <p
                  className={`text-[10px] mt-1 ${
                    mine ? 'text-gray-400' : 'text-gray-400'
                  }`}
                >
                  {new Date(m.created_at).toLocaleString()}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {canSend ? (
        <div className="flex flex-col sm:flex-row gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Type a message…"
            rows={2}
            className="flex-1 border border-gray-300 rounded-xl p-3 text-sm resize-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send()
              }
            }}
          />
          <button
            type="button"
            disabled={sending || !draft.trim()}
            onClick={send}
            className="bg-black text-white px-4 py-3 rounded-xl font-medium text-sm min-h-[48px] disabled:opacity-50 sm:self-end"
          >
            {sending ? 'Sending…' : 'Send'}
          </button>
        </div>
      ) : (
        readOnlyHint && (
          <p className="text-xs text-gray-500">{readOnlyHint}</p>
        )
      )}

      <button
        type="button"
        onClick={load}
        className="text-xs text-blue-700 font-medium min-h-[40px]"
      >
        Refresh messages
      </button>
    </section>
  )
}

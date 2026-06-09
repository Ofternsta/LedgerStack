'use client'

import { LegalNotice } from '@/components/legal-notice'
import { useCallback, useEffect, useState, type ReactNode } from 'react'

type Note = {
  id: string
  author_id: string
  author_name: string
  author_role: string
  body: string
  note_kind: string
  claim_id: string | null
  created_at: string
  mentioned_users: Array<{ id: string; name: string }>
}

type Props = {
  projectId: string
  claimId?: string | null
  canPost: boolean
  variant?: 'panel' | 'sidebar'
}

function kindLabel(kind: string) {
  if (kind === 'status_update') return 'Status update'
  if (kind === 'mention') return 'Mention'
  return 'Note'
}

function NoteBody({ body }: { body: string }) {
  const mentionPattern = /@\[([^\]]+)\]\(([0-9a-f-]{36})\)/gi
  const parts: ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null
  let key = 0

  while ((match = mentionPattern.exec(body)) !== null) {
    if (match.index > lastIndex) {
      parts.push(body.slice(lastIndex, match.index))
    }
    parts.push(
      <span
        key={`mention-${key++}`}
        className="font-semibold text-white underline decoration-white/40"
      >
        @{match[1]}
      </span>
    )
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < body.length) {
    parts.push(body.slice(lastIndex))
  }

  return <p className="leading-relaxed whitespace-pre-wrap text-white">{parts}</p>
}

export function InternalNotesPanel({
  projectId,
  claimId,
  canPost,
  variant = 'panel',
}: Props) {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ project_id: projectId })
    if (claimId) params.set('claim_id', claimId)
    const res = await fetch(`/api/internal-notes?${params}`)
    const payload = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(payload.error || 'Could not load notes')
      setNotes([])
    } else {
      setError(null)
      setNotes(payload.notes || [])
    }
    setLoading(false)
  }, [projectId, claimId])

  useEffect(() => {
    load()
  }, [load])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!canPost || !draft.trim()) return
    setSaving(true)
    setError(null)
    const res = await fetch('/api/internal-notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_id: projectId,
        claim_id: claimId || null,
        body: draft.trim(),
        note_kind: 'note',
      }),
    })
    const payload = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(payload.error || 'Could not post note')
      setSaving(false)
      return
    }
    setDraft('')
    await load()
    setSaving(false)
  }

  const isSidebar = variant === 'sidebar'
  const Wrapper = isSidebar ? 'div' : 'section'
  const wrapperClass = isSidebar
    ? 'flex flex-col gap-3'
    : 'border border-border rounded-xl p-4 bg-surface-elevated space-y-3'

  return (
    <Wrapper className={wrapperClass}>
      <div className={isSidebar ? 'shrink-0' : undefined}>
        <h2 className={isSidebar ? 'font-bold text-foreground' : 'font-bold text-lg'}>
          Project notes
        </h2>
      </div>

      {error && (
        <p className="text-sm alert-error rounded-lg p-2">
          {error}
        </p>
      )}

      {canPost && (
        <form
          onSubmit={submit}
          className="space-y-2 border border-gray-100 rounded-xl p-3 bg-surface shrink-0"
        >
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Add an internal note…"
            rows={3}
            className="w-full border border-border rounded-xl p-3 text-sm resize-none bg-surface-elevated"
          />
          <button
            type="submit"
            disabled={saving || !draft.trim()}
            className="w-full btn-primary text-[#052e16] py-3 rounded-xl font-medium text-sm disabled:opacity-50 min-h-[48px]"
          >
            {saving ? 'Posting…' : 'Post to team log'}
          </button>
        </form>
      )}

      <div
        className={`border border-neutral-700 rounded-xl bg-neutral-900 divide-y divide-neutral-800 ${
          isSidebar ? '' : 'max-h-[360px] overflow-y-auto'
        }`}
        aria-live="polite"
      >
        {loading && (
          <p className="text-sm text-neutral-400 text-center py-6">Loading history…</p>
        )}
        {!loading && notes.length === 0 && (
          <p className="text-sm text-neutral-400 text-center py-6">
            No internal notes yet.
          </p>
        )}
        {notes.map((n) => {
          return (
            <article key={n.id} className="p-3 text-sm">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="font-semibold text-white">
                  {n.author_name}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300">
                  {kindLabel(n.note_kind)}
                </span>
                <span className="text-xs text-neutral-400 ml-auto">
                  {new Date(n.created_at).toLocaleString()}
                </span>
              </div>
              <NoteBody body={n.body} />
              {n.mentioned_users.length > 0 && (
                <p className="text-xs text-neutral-300 mt-2">
                  Notified: {n.mentioned_users.map((u) => u.name).join(', ')}
                </p>
              )}
            </article>
          )
        })}
      </div>

      <button
        type="button"
        onClick={load}
        className="text-xs text-brand-bright font-medium min-h-[40px] shrink-0"
      >
        Refresh log
      </button>

      {!isSidebar && <LegalNotice id="worker-audit" />}
    </Wrapper>
  )
}

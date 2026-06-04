export type TimelineEvent = {
  id?: string
  claim_id?: string
  event_date: string
  title: string
  description: string
  source?: string
  created_at?: string
  client_name?: string
}

export function eventSortTime(e: TimelineEvent): number {
  const raw = e.created_at || e.event_date
  const t = Date.parse(raw)
  return Number.isNaN(t) ? 0 : t
}

export function formatTimelineSource(source?: string): string | undefined {
  if (!source) return undefined
  if (source === 'evidence') return 'Document'
  if (source === 'ai') return 'AI'
  if (source === 'manual') return 'Team'
  return source
}

export function formatEventWhen(e: TimelineEvent): string {
  if (e.created_at) {
    return new Date(e.created_at).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  }
  return e.event_date
}

export function TimelineList({
  events,
  newestFirst,
  showClaimName,
}: {
  events: TimelineEvent[]
  newestFirst: boolean
  showClaimName?: boolean
}) {
  const ordered = [...events].sort((a, b) => {
    const diff = eventSortTime(b) - eventSortTime(a)
    return newestFirst ? diff : -diff
  })

  if (!ordered.length) {
    return <p className="text-sm text-muted-dim">No entries yet.</p>
  }

  return (
    <ol className="space-y-3 border-l-2 border-border pl-4 ml-1">
      {ordered.map((e, i) => (
        <li
          key={e.id || `${e.event_date}-${e.title}-${i}`}
          className="relative"
        >
          <span className="absolute -left-[1.15rem] top-1.5 h-2 w-2 rounded-full bg-brand" />
          <p className="text-xs text-muted-dim">{formatEventWhen(e)}</p>
          <p className="font-medium text-sm text-foreground">
            {e.title}
            {showClaimName && e.client_name ? (
              <span className="text-muted font-normal"> · {e.client_name}</span>
            ) : null}
          </p>
          {e.description ? (
            <p className="text-sm text-muted mt-0.5">{e.description}</p>
          ) : null}
          {formatTimelineSource(e.source) ? (
            <p className="text-[10px] uppercase tracking-wide text-muted-dim mt-1">
              {formatTimelineSource(e.source)}
            </p>
          ) : null}
        </li>
      ))}
    </ol>
  )
}

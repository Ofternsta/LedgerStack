'use client'

import { useEffect, useState } from 'react'

const DOT_FRAMES = ['.', '..', '...'] as const

type LedgerStackLoaderProps = {
  className?: string
}

/** Text loader: Loading → Loading. → Loading.. → Loading... (loops). */
export function LedgerStackLoader({ className = '' }: LedgerStackLoaderProps) {
  const [frame, setFrame] = useState(0)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setFrame(DOT_FRAMES.length - 1)
      return
    }

    const id = window.setInterval(() => {
      setFrame((f) => (f + 1) % DOT_FRAMES.length)
    }, 450)

    return () => clearInterval(id)
  }, [])

  const dots = DOT_FRAMES[frame]

  return (
    <p
      className={`text-sm font-medium text-muted ${className}`.trim()}
      role="status"
      aria-live="polite"
      aria-label="Loading"
    >
      Loading
      <span className="inline-block min-w-[3ch] text-left tabular-nums">{dots}</span>
    </p>
  )
}

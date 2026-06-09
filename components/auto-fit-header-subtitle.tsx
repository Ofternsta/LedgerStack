'use client'

import { useCallback, useLayoutEffect, useRef, useState } from 'react'

const MAX_PX = 14
const MIN_PX = 9

type AutoFitHeaderSubtitleProps = {
  text: string
}

/** Shrinks subtitle font size so the full line fits without truncation. */
export function AutoFitHeaderSubtitle({ text }: AutoFitHeaderSubtitleProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLParagraphElement>(null)
  const [fontSize, setFontSize] = useState(MAX_PX)

  const fitText = useCallback(() => {
    const container = containerRef.current
    const el = textRef.current
    if (!container || !el) return

    let size = MAX_PX
    el.style.fontSize = `${size}px`

    let guard = 0
    while (size > MIN_PX && el.scrollWidth > container.clientWidth && guard < 60) {
      guard += 1
      size -= 0.5
      el.style.fontSize = `${size}px`
    }

    setFontSize(size)
  }, [text])

  useLayoutEffect(() => {
    fitText()

    const container = containerRef.current
    if (!container || typeof ResizeObserver === 'undefined') return

    const observer = new ResizeObserver(() => fitText())
    observer.observe(container)
    return () => observer.disconnect()
  }, [text, fitText])

  return (
    <div ref={containerRef} className="min-w-0 w-full">
      <p
        ref={textRef}
        className="text-muted mt-1 leading-snug whitespace-nowrap"
        style={{ fontSize: `${fontSize}px` }}
      >
        {text}
      </p>
    </div>
  )
}

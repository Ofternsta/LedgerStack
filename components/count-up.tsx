'use client'

import { useEffect, useRef, useState } from 'react'

type CountUpProps = {
  value: number
  duration?: number
  className?: string
}

export function CountUp({ value, duration = 1200, className = '' }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const [display, setDisplay] = useState(0)
  const hasAnimated = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplay(value)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting || hasAnimated.current) return
        hasAnimated.current = true
        observer.disconnect()

        const start = performance.now()
        const from = 0
        const to = value

        function tick(now: number) {
          const t = Math.min(1, (now - start) / duration)
          const eased = 1 - (1 - t) ** 3
          setDisplay(Math.round(from + (to - from) * eased))
          if (t < 1) requestAnimationFrame(tick)
        }

        requestAnimationFrame(tick)
      },
      { threshold: 0.2 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [value, duration])

  useEffect(() => {
    if (!hasAnimated.current) return
    setDisplay(value)
  }, [value])

  return (
    <span ref={ref} className={className}>
      {display.toLocaleString()}
    </span>
  )
}

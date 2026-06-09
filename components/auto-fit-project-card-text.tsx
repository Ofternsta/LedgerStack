'use client'

import { useCallback, useLayoutEffect, useRef, useState } from 'react'

const NAME_MAX_PX = 24
const NAME_MIN_PX = 12
const ADDRESS_MAX_PX = 18
const ADDRESS_MIN_PX = 10
/** Target vertical space for name + address inside the project card. */
const TARGET_HEIGHT_PX = 104
const TEXT_GAP_PX = 6

type Props = {
  customerName: string
  projectAddress: string
}

/** Shrinks name/address font sizes so both fit in the card without clipping. */
export function AutoFitProjectCardText({
  customerName,
  projectAddress,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const nameRef = useRef<HTMLParagraphElement>(null)
  const addressRef = useRef<HTMLParagraphElement>(null)
  const [sizes, setSizes] = useState({ name: NAME_MAX_PX, address: ADDRESS_MAX_PX })

  const fitText = useCallback(() => {
    const nameEl = nameRef.current
    const addressEl = addressRef.current
    if (!nameEl || !addressEl) return

    let nameSize = NAME_MAX_PX
    let addressSize = ADDRESS_MAX_PX

    const apply = () => {
      nameEl.style.fontSize = `${nameSize}px`
      addressEl.style.fontSize = `${addressSize}px`
    }

    const combinedHeight = () =>
      nameEl.offsetHeight + addressEl.offsetHeight + TEXT_GAP_PX

    apply()

    let guard = 0
    while (combinedHeight() > TARGET_HEIGHT_PX && guard < 80) {
      guard += 1
      if (nameSize > NAME_MIN_PX) nameSize -= 1
      if (addressSize > ADDRESS_MIN_PX) addressSize -= 1
      apply()
      if (nameSize <= NAME_MIN_PX && addressSize <= ADDRESS_MIN_PX) break
    }

    setSizes({ name: nameSize, address: addressSize })
  }, [])

  useLayoutEffect(() => {
    fitText()

    const container = containerRef.current
    if (!container || typeof ResizeObserver === 'undefined') return

    const observer = new ResizeObserver(() => fitText())
    observer.observe(container)
    return () => observer.disconnect()
  }, [customerName, projectAddress, fitText])

  return (
    <div
      ref={containerRef}
      className="flex w-full min-w-0 flex-col justify-center"
    >
      <p
        ref={nameRef}
        className="font-bold text-brand-bright leading-snug break-words hyphens-auto w-full"
        style={{ fontSize: sizes.name }}
      >
        {customerName}
      </p>
      <p
        ref={addressRef}
        className="text-muted leading-snug break-words hyphens-auto w-full"
        style={{ fontSize: sizes.address, marginTop: TEXT_GAP_PX }}
      >
        {projectAddress}
      </p>
    </div>
  )
}

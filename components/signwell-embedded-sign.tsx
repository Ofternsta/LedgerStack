'use client'

import Script from 'next/script'
import { useEffect, useRef, useState } from 'react'

declare global {
  interface Window {
    SignWellEmbed?: new (options: {
      url: string
      events?: {
        completed?: (e: { id?: string }) => void
        closed?: (e: { id?: string }) => void
        error?: (e: unknown) => void
      }
    }) => { open: () => void }
  }
}

type Props = {
  signingUrl: string
  onCompleted: () => void
  onClosed?: () => void
}

export function SignWellEmbeddedSign({
  signingUrl,
  onCompleted,
  onClosed,
}: Props) {
  const [scriptReady, setScriptReady] = useState(false)
  const openedRef = useRef(false)

  useEffect(() => {
    if (!scriptReady || !signingUrl || openedRef.current) return
    if (!window.SignWellEmbed) return

    openedRef.current = true
    const embed = new window.SignWellEmbed({
      url: signingUrl,
      events: {
        completed: () => {
          onCompleted()
        },
        closed: () => {
          onClosed?.()
        },
      },
    })
    embed.open()
  }, [scriptReady, signingUrl, onCompleted, onClosed])

  return (
    <>
      <Script
        src="https://static.signwell.com/assets/embedded.js"
        strategy="afterInteractive"
        onReady={() => setScriptReady(true)}
      />
      <p className="text-sm text-muted text-center py-8">
        Opening secure signing window…
      </p>
    </>
  )
}

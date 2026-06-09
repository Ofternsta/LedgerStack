function isPhoneViewport(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(max-width: 767px)').matches
  )
}

function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  return (
    /iPad|iPhone|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  )
}

function isAndroidPhone(): boolean {
  return (
    isPhoneViewport() &&
    typeof navigator !== 'undefined' &&
    /Android/i.test(navigator.userAgent)
  )
}

function filenameFromDisposition(header: string | null): string | null {
  if (!header) return null
  const star = header.match(/filename\*=UTF-8''([^;]+)/i)
  if (star?.[1]) {
    try {
      return decodeURIComponent(star[1].trim())
    } catch {
      return star[1].trim()
    }
  }
  const plain = header.match(/filename="([^"]+)"/i)
  return plain?.[1]?.trim() ?? null
}

function triggerAnchorDownload(
  href: string,
  filename: string,
  revokeUrl?: string
): { ok: true } | { ok: false; error: string } {
  try {
    const link = document.createElement('a')
    link.href = href
    link.download = filename
    link.rel = 'noopener'
    link.style.display = 'none'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    if (revokeUrl) {
      window.setTimeout(() => URL.revokeObjectURL(revokeUrl), 60_000)
    }
    return { ok: true }
  } catch {
    if (revokeUrl) URL.revokeObjectURL(revokeUrl)
    return { ok: false, error: 'Could not start download' }
  }
}

async function tryShareDownload(
  blob: Blob,
  filename: string
): Promise<boolean> {
  if (typeof navigator === 'undefined' || !('share' in navigator)) {
    return false
  }

  const file = new File([blob], filename, {
    type: blob.type || 'application/octet-stream',
  })

  try {
    if ('canShare' in navigator && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: filename })
      return true
    }
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return true
    }
  }

  return false
}

/** Save a blob as a downloaded file (platform-specific behavior on phones). */
export async function saveBlobAsDownload(
  blob: Blob,
  filename: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const safeName = filename.trim() || 'download'
  const phone = isPhoneViewport()
  const ios = phone && isIOS()
  const android = isAndroidPhone()

  // iOS Safari ignores download on blob URLs — Share → Save to Files is reliable.
  if (ios) {
    if (await tryShareDownload(blob, safeName)) {
      return { ok: true }
    }
  }

  const downloadBlob = phone
    ? new Blob([blob], { type: 'application/octet-stream' })
    : blob
  const url = URL.createObjectURL(downloadBlob)
  const anchorResult = triggerAnchorDownload(url, safeName, url)
  if (anchorResult.ok) {
    return anchorResult
  }

  // Android fallback when the anchor did not start a download (some PDF/image viewers).
  if (android && (await tryShareDownload(blob, safeName))) {
    return { ok: true }
  }

  return anchorResult
}

/** Fetch a same-origin URL and save the response as a download. */
export async function saveUrlAsDownload(
  url: string,
  filename?: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const safeName = filename?.trim() || 'download'

  // Android Chrome: same-origin GET + download attr uses the server's attachment header.
  if (isAndroidPhone()) {
    const direct = triggerAnchorDownload(url, safeName)
    if (direct.ok) {
      return direct
    }
  }

  const res = await fetch(url, { credentials: 'same-origin' })
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}))
    return {
      ok: false,
      error: (payload as { error?: string }).error || 'Download failed',
    }
  }

  const blob = await res.blob()
  const resolvedName =
    filename ||
    filenameFromDisposition(res.headers.get('Content-Disposition')) ||
    'download'

  return saveBlobAsDownload(blob, resolvedName)
}

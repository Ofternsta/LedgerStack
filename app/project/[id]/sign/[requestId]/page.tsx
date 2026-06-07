'use client'

import Link from 'next/link'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { LedgerStackLoader } from '@/components/ledgerstack-loader'
import { ProjectPageHeader } from '@/components/project-page-header'
import type { SignatureRequestRow } from '@/lib/signature-request-types'
import { loadUserAccess } from '@/lib/load-access'

export default function SignDocumentPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const projectId = params.id as string
  const requestId = params.requestId as string

  const [loading, setLoading] = useState(true)
  const [request, setRequest] = useState<SignatureRequestRow | null>(null)
  const [signingUrl, setSigningUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(searchParams.get('completed') === '1')
  const completingRef = useRef(false)
  const retryCountRef = useRef(0)

  const syncCompletion = useCallback(async () => {
    if (completingRef.current) return
    completingRef.current = true
    setError(null)

    const res = await fetch(`/api/signature-requests/${requestId}`, {
      method: 'POST',
    })
    if (!res.ok) {
      const payload = await res.json().catch(() => ({}))
      setError(
        payload.error ||
          'Signing finished in SignWell, but we could not save the signed copy yet. Please refresh in a moment.'
      )
      completingRef.current = false
      return
    }
    setDone(true)
    router.replace(`/project/${projectId}?signed=1`)
  }, [requestId, projectId, router])

  const load = useCallback(
    async (options?: { reissue?: boolean }) => {
      setLoading(true)
      setError(null)

      const { access } = await loadUserAccess()
      if (!access || access.role !== 'client') {
        router.replace('/login')
        return
      }

      const params = new URLSearchParams()
      if (options?.reissue) params.set('reissue', '1')

      const res = await fetch(
        `/api/signature-requests/${requestId}${
          params.size ? `?${params.toString()}` : ''
        }`
      )
      const payload = await res.json().catch(() => ({}))

      if (!res.ok) {
        setError(payload.error || 'Could not load signature request')
        setLoading(false)
        return
      }

      const row = payload.request as SignatureRequestRow
      if (row.project_id !== projectId) {
        setError('This signature request does not belong to this project.')
        setLoading(false)
        return
      }

      setRequest(row)

      if (row.status === 'signed') {
        setDone(true)
        setLoading(false)
        return
      }

      if (!['pending', 'viewed', 'expired'].includes(row.status)) {
        setError(`This request is ${row.status} and can no longer be signed.`)
        setLoading(false)
        return
      }

      const freshUrl = payload.signing_url as string | null | undefined
      const signingError = payload.signing_error as string | null | undefined

      if (!freshUrl) {
        setSigningUrl(null)
        setError(
          signingError ||
            'Could not open a fresh signing link. Try again or ask your contractor for a new request.'
        )
        setLoading(false)
        return
      }

      setSigningUrl(freshUrl)
      setLoading(false)
    },
    [requestId, projectId, router]
  )

  async function refreshSigningLink(reissue = false) {
    if (reissue) retryCountRef.current += 1
    setSigningUrl(null)
    await load({ reissue })
  }

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (searchParams.get('completed') !== '1') return
    if (!request || request.status === 'signed') return
    void syncCompletion()
  }, [request, searchParams, syncCompletion])

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <LedgerStackLoader />
      </div>
    )
  }

  return (
    <div className="min-h-dvh flex flex-col">
      <ProjectPageHeader
        title="Sign document"
        location={request?.source_file_name || 'Electronic signature'}
        backHref={`/project/${projectId}`}
        backLabel="Project"
      />
      <main className="flex-1 safe-x px-4 py-6 max-w-lg mx-auto w-full space-y-4">
        {error && (
          <p className="text-sm alert-error rounded-xl p-3">{error}</p>
        )}

        {done ? (
          <div className="card-elevated p-6 text-center space-y-3">
            <h2 className="font-bold text-lg text-foreground">Thank you</h2>
            <p className="text-sm text-muted">
              Your signed document has been recorded. It will appear under Signed
              documents on the project.
            </p>
            <Link
              href={`/project/${projectId}`}
              className="inline-flex btn-primary px-6 py-3 rounded-xl min-h-[48px]"
            >
              Back to project
            </Link>
          </div>
        ) : signingUrl ? (
          <div className="card-elevated p-6 space-y-4">
            <p className="text-sm text-muted leading-relaxed">
              Tap below to open SignWell in your browser. Type your name to sign
              — no drawing required. When you finish, you&apos;ll return here
              automatically.
            </p>
            <a
              href={signingUrl}
              className="flex w-full items-center justify-center btn-primary text-[#052e16] py-4 rounded-xl font-medium min-h-[52px]"
            >
              Continue to sign
            </a>
            <button
              type="button"
              onClick={() => void refreshSigningLink(true)}
              className="w-full border border-border px-4 py-3 rounded-xl text-sm font-medium min-h-[48px]"
            >
              Link not working? Get a fresh link
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted">
              {error || 'No signing URL available.'}
            </p>
            <button
              type="button"
              onClick={() =>
                void refreshSigningLink(retryCountRef.current >= 1)
              }
              className="w-full border border-border px-4 py-3 rounded-xl text-sm font-medium min-h-[48px]"
            >
              Try again
            </button>
          </div>
        )}
      </main>
    </div>
  )
}

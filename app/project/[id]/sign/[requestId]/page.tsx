'use client'

import Link from 'next/link'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { SignWellEmbeddedSign } from '@/components/signwell-embedded-sign'
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

  const syncCompletion = useCallback(async () => {
    if (completingRef.current) return
    completingRef.current = true
    setDone(true)

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
    router.replace(`/project/${projectId}?signed=1`)
  }, [requestId, projectId, router])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    const { access } = await loadUserAccess()
    if (!access || access.role !== 'client') {
      router.replace('/login')
      return
    }

    const res = await fetch(`/api/signature-requests/${requestId}`)
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

    if (!['pending', 'viewed'].includes(row.status)) {
      setError(`This request is ${row.status} and can no longer be signed.`)
      setLoading(false)
      return
    }

    setSigningUrl(payload.signing_url || row.embedded_signing_url)
    setLoading(false)
  }, [requestId, projectId, router])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (searchParams.get('completed') !== '1') return
    if (!request || request.status === 'signed') return
    void syncCompletion()
  }, [request, searchParams, syncCompletion])

  async function handleCompleted() {
    await syncCompletion()
  }

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
          <>
            <p className="text-sm text-muted">
              Use the secure SignWell window to type your name and complete the
              signature. You do not need to draw a signature.
            </p>
            <SignWellEmbeddedSign
              signingUrl={signingUrl}
              onCompleted={() => void handleCompleted()}
            />
          </>
        ) : (
          <p className="text-sm text-muted">No signing URL available.</p>
        )}
      </main>
    </div>
  )
}

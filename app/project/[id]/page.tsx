'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { EvidenceFolders } from '@/components/evidence-folders'
import { ProjectPageHeader } from '@/components/project-page-header'
import { JobTimelinePanel } from '@/components/job-timeline-panel'
import { ClaimStatusWorkflow } from '@/components/claim-status-workflow'
import { ProjectAiExportSection } from '@/components/project-ai-export-section'
import { ProjectArchivePanel } from '@/components/project-archive-panel'
import {
  defaultFileCategories,
  type FileCategory,
} from '@/lib/project-file-categories'
import {
  DEFAULT_STATUS_WORKFLOW,
  isCompletedStatus,
  normalizeStatusKey,
  statusLabel,
  type StatusStage,
} from '@/lib/project-status-workflow'
import { EvidenceUpload } from '@/components/evidence-upload'
import { LedgerStackLoader } from '@/components/ledgerstack-loader'
import { InternalNotesPanel } from '@/components/internal-notes-panel'
import { AddJobDialog, ProjectJobsList } from '@/components/project-jobs-list'
import { ProjectAiChat } from '@/components/project-ai-chat'
import { ProjectSchedulePanel } from '@/components/project-schedule-panel'
import { ClientSignaturesPanel } from '@/components/client-signatures-panel'
import { AdminSignatureRequestsPanel } from '@/components/admin-signature-requests-panel'
import { isUnlimited } from '@/lib/plan-entitlements'
import { loadUserAccess } from '@/lib/load-access'
import type { UserAccess } from '@/lib/roles'
import type { WorkerPermissions } from '@/lib/worker-permissions'
import { supabase } from '@/lib/supabase'
import { displayJobDescription } from '@/lib/job-display-notes'
import { uploadEvidenceWithAi } from '@/lib/upload-evidence-server'
import { validateUploadSize } from '@/lib/upload-limits'

type Claim = {
  id: string
  client_name: string
  property_address: string
  status: string
  notes?: string | null
}

type Evidence = {
  id: string
  claim_id: string
  file_name: string
  file_path: string
  file_type: string
  evidence_type: string
  summary: string
  extracted_text?: string
  created_at?: string
  uploaded_by_label?: string
}

export default function ProjectPageClient() {
  const params = useParams()
  const searchParams = useSearchParams()
  const id = params.id as string
  const [access, setAccess] = useState<UserAccess | null>(null)
  const [claims, setClaims] = useState<Claim[]>([])
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null)
  const [documents, setDocuments] = useState<Evidence[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [uploadProgressLabel, setUploadProgressLabel] = useState<string>('Processing…')
  const [uploadMessage, setUploadMessage] = useState<string | null>(null)
  const [configError, setConfigError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const [timelineRefreshKey, setTimelineRefreshKey] = useState(0)
  const [archivePrompt, setArchivePrompt] = useState(false)
  const [statusWorkflow, setStatusWorkflow] = useState<StatusStage[]>(
    DEFAULT_STATUS_WORKFLOW.map((s) => ({ ...s }))
  )
  const [fileCategories, setFileCategories] = useState<FileCategory[]>(
    defaultFileCategories()
  )
  const [projectNotes, setProjectNotes] = useState<string | null>(null)
  const [addJobOpen, setAddJobOpen] = useState(false)
  const [deletingJob, setDeletingJob] = useState(false)
  const [highlightFilePath, setHighlightFilePath] = useState<string | null>(null)

  function mergeWorkerProjectAccess(
    base: UserAccess,
    wp: WorkerPermissions
  ): UserAccess {
    return {
      ...base,
      canUploadEvidence: wp.can_upload,
      canViewFiles: wp.can_view_files,
      canDownloadFiles: wp.can_download_files,
      canDeleteEvidence: wp.can_delete,
      canManageSchedule: base.canViewCalendar && wp.can_add_events,
      canUpdateClaimInfo:
        wp.can_upload || wp.can_add_events || wp.can_view_files,
      canUseProjectAiChat: wp.can_use_ai_chat,
    }
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUserId(user?.id ?? null))

    async function loadAccessForProject() {
      const { access: base } = await loadUserAccess()
      if (!base) {
        setAccess(null)
        return
      }

      if (base.role === 'worker') {
        const res = await fetch(`/api/projects/${id}/my-access`)
        const payload = await res.json().catch(() => ({}))
        if (!res.ok || !payload.permissions) {
          window.location.href = '/projects'
          return
        }
        setAccess(mergeWorkerProjectAccess(base, payload.permissions))
        return
      }

      setAccess(base)
      if (base.role === 'client') {
        void fetch('/api/auth/link-client-access', { method: 'POST' })
      }
    }

    void loadAccessForProject()
  }, [id])

  useEffect(() => {
    async function loadProjectConfig() {
      const [workflowRes, categoriesRes, projectRes] = await Promise.all([
        fetch(`/api/projects/${id}/workflow`),
        fetch(`/api/projects/${id}/file-categories`),
        supabase.from('projects').select('notes').eq('id', id).maybeSingle(),
      ])
      const workflowPayload = await workflowRes.json().catch(() => ({}))
      const categoriesPayload = await categoriesRes.json().catch(() => ({}))
      if (workflowRes.ok && workflowPayload.workflow) {
        setStatusWorkflow(workflowPayload.workflow as StatusStage[])
      }
      if (categoriesRes.ok && categoriesPayload.categories) {
        setFileCategories(categoriesPayload.categories as FileCategory[])
      }
      if (!projectRes.error && projectRes.data) {
        setProjectNotes(projectRes.data.notes ?? null)
      }
    }
    void loadProjectConfig()
  }, [id])

  useEffect(() => {
    if (searchParams.get('signed') !== '1') return
    void reloadProjectConfig()
    if (selectedClaim) {
      void fetchEvidence(selectedClaim.id)
    }
  }, [searchParams, selectedClaim?.id])

  async function fetchClaims() {
    setLoading(true)

    const { data, error } = await supabase
      .from('claims')
      .select('id, client_name, property_address, status, notes')
      .eq('project_id', id)
      .order('created_at', { ascending: true })

    if (error) {
      console.error(error)
      setClaims([])
      setSelectedClaim(null)
      setLoading(false)
      return
    }

    const safe = (data || []) as Claim[]
    setClaims(safe)
    setSelectedClaim(safe.length > 0 ? safe[0] : null)
    setLoading(false)
  }

  async function reloadProjectConfig() {
    const categoriesRes = await fetch(`/api/projects/${id}/file-categories`)
    const categoriesPayload = await categoriesRes.json().catch(() => ({}))
    if (categoriesRes.ok && categoriesPayload.categories) {
      setFileCategories(categoriesPayload.categories as FileCategory[])
    }
  }

  async function refreshAccess() {
    const { access: next } = await loadUserAccess()
    if (!next) return
    if (next.role === 'worker') {
      const res = await fetch(`/api/projects/${id}/my-access`)
      const payload = await res.json().catch(() => ({}))
      if (res.ok && payload.permissions) {
        setAccess(mergeWorkerProjectAccess(next, payload.permissions))
      }
    } else {
      setAccess(next)
    }
  }

  async function navigateToDocument(claimId: string, filePath: string) {
    const claim = claims.find((c) => c.id === claimId)
    if (!claim) return

    setSearch('')

    if (selectedClaim?.id !== claimId) {
      setSelectedClaim(claim)
      await fetchEvidence(claimId)
    }

    setHighlightFilePath(filePath)
    document.getElementById('project-documents')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }

  async function fetchEvidence(claimId?: string) {
    const targetId = claimId || selectedClaim?.id

    if (!targetId || !access?.canViewFiles) {
      setDocuments([])
      return
    }

    setConfigError(null)

    const res = await fetch(
      `/api/evidence?claim_id=${targetId}&project_id=${id}`
    )
    const payload = await res.json().catch(() => ({}))

    if (res.status === 401) {
      window.location.href = '/login'
      return
    }

    if (!res.ok) {
      setConfigError(payload.error || 'Failed to load documents')
      setDocuments([])
      return
    }

    setDocuments(payload.evidence || [])
  }

  async function uploadFile(file: File) {
    if (!selectedClaim || !access?.canUploadEvidence) return

    if (file.size === 0) {
      setUploadMessage('That file is empty. Please try again.')
      return
    }

    const sizeError = validateUploadSize(file.size)
    if (sizeError) {
      setUploadMessage(sizeError)
      return
    }

    setUploading(true)
    setUploadProgress(0)
    setUploadProgressLabel('Preparing…')
    setUploadMessage(null)
    setConfigError(null)

    try {
      const evidence = await uploadEvidenceWithAi(
        id,
        selectedClaim.id,
        file,
        (pct, label) => {
          setUploadProgress(pct)
          setUploadProgressLabel(label)
        }
      )

      await fetchEvidence(selectedClaim.id)
      setUploadMessage(
        `Uploaded ${file.name} — categorized as ${evidence.evidence_type}`
      )
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Upload failed'
      if (message.toLowerCase().includes('jwt') || message.includes('401')) {
        window.location.href = '/login'
        return
      }
      setUploadMessage(message)
    }

    setUploading(false)
    setUploadProgress(null)
  }

  async function uploadMany(files: File[]) {
    if (!selectedClaim || !access?.canUploadEvidence) return
    setUploading(true)
    setUploadProgress(0)
    setUploadMessage(null)
    let ok = 0
    const total = files.length
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const sizeError = validateUploadSize(file.size)
      if (sizeError) {
        setUploadMessage(sizeError)
        break
      }
      try {
        await uploadEvidenceWithAi(id, selectedClaim.id, file, (pct, label) => {
          const overall = Math.round(((i + pct / 100) / total) * 100)
          setUploadProgress(overall)
          setUploadProgressLabel(
            total > 1 ? `File ${i + 1} of ${total}: ${label}` : label
          )
        })
        ok++
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Upload failed'
        setUploadMessage(message)
        break
      }
    }
    await fetchEvidence(selectedClaim.id)
    if (ok > 0) {
      setUploadMessage(`Uploaded ${ok} file(s) with AI analysis`)
    }
    setUploading(false)
    setUploadProgress(null)
  }

  async function deleteFile(filePath: string) {
    if (!access?.canDeleteEvidence) return
    setConfigError(null)

    const res = await fetch(
      `/api/evidence?file_path=${encodeURIComponent(filePath)}`,
      { method: 'DELETE' }
    )

    const payload = await res.json().catch(() => ({}))

    if (res.status === 401) {
      window.location.href = '/login'
      return
    }

    if (!res.ok) {
      setConfigError(payload.error || 'Failed to delete file')
      return
    }

    await fetchEvidence(selectedClaim?.id)
  }

  async function openFile(filePath: string) {
    if (!access?.canViewFiles) {
      setConfigError('You do not have permission to view project files.')
      return
    }

    setConfigError(null)

    const res = await fetch(
      `/api/evidence/open?file_path=${encodeURIComponent(filePath)}&project_id=${encodeURIComponent(id)}`
    )
    const payload = await res.json().catch(() => ({}))

    if (res.status === 401) {
      window.location.href = '/login'
      return
    }

    if (!res.ok || !payload.signedUrl) {
      setConfigError(payload.error || 'Could not open file')
      return
    }

    window.open(payload.signedUrl as string, '_blank')
  }

  useEffect(() => {
    if (!id) return
    fetchClaims()
  }, [id])

  useEffect(() => {
    if (selectedClaim?.id && access?.canViewFiles) {
      fetchEvidence(selectedClaim.id)
    }
    if (selectedClaim?.id && access && !access.canViewFiles) {
      setDocuments([])
    }
  }, [selectedClaim?.id, access?.canViewFiles])

  if (loading || !access) {
    return (
      <div className="min-h-dvh flex items-center justify-center safe-x">
        <LedgerStackLoader />
      </div>
    )
  }

  if (!claims.length) {
    return (
      <div className="min-h-dvh">
        <ProjectPageHeader
          title="No access"
          location="Return to your project list."
          backHref="/projects"
          backLabel="Projects"
        />
        <div className="safe-x px-4 py-6 max-w-5xl mx-auto">
          <p className="text-gray-600">
            {access.role === 'client'
              ? 'There are no jobs on this project yet. Your contractor will add progress here.'
              : 'You do not have access to this project, or it has no jobs yet.'}
          </p>
        </div>
      </div>
    )
  }

  const activeClaim = selectedClaim ?? claims[0]
  const isClientViewer = access.role === 'client'
  const activeStatusKey = activeClaim
    ? normalizeStatusKey(activeClaim.status, statusWorkflow)
    : null
  const allJobsCompleted =
    claims.length > 0 &&
    claims.every((c) => isCompletedStatus(c.status, statusWorkflow))

  if (!activeClaim) {
    return (
      <div className="min-h-dvh">
        <ProjectPageHeader
          title="No access"
          location="Return to your project list."
          backHref="/projects"
          backLabel="Projects"
        />
        <div className="safe-x px-4 py-6 max-w-5xl mx-auto">
          <p className="text-gray-600">No job selected for this project.</p>
        </div>
      </div>
    )
  }

  if (access.workerBlockedByStaffLimit) {
    return (
      <div className="min-h-dvh">
        <ProjectPageHeader
          title="Worker access paused"
          location="This organization is over the worker limit."
          backHref="/projects"
          backLabel="Projects"
        />
        <div className="safe-x px-4 py-6 max-w-5xl mx-auto">
          <p className="text-sm bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-4">
            Your organization has more approved workers than this plan allows.
            Workers cannot access projects until the company upgrades or reduces
            approved workers.
          </p>
        </div>
      </div>
    )
  }

  const q = search.toLowerCase().trim()
  const filtered = documents.filter((doc) => {
    const haystack = [
      doc.file_name,
      doc.summary,
      doc.evidence_type,
      doc.extracted_text,
      doc.uploaded_by_label,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return !q || haystack.includes(q)
  })

  return (
    <div className="min-h-dvh flex flex-col">
      <ProjectPageHeader
        title={activeClaim.client_name}
        location={activeClaim.property_address}
        backHref="/projects"
        backLabel="Projects"
      />

      <div className="flex w-full gap-3 lg:gap-4 px-3 sm:px-4 lg:px-5 py-4 items-start">
        <div className="hidden lg:block w-72 xl:w-80 shrink-0">
          <div className="card-elevated p-4 shadow-sm">
            <ProjectJobsList
            jobs={claims}
            projectId={id}
            legacyProjectNotes={projectNotes}
            workflow={statusWorkflow}
            selectedId={selectedClaim?.id ?? null}
            canAddJob={access.canCreateProject}
            canDeleteJob={access.canCreateProject}
            onJobAdded={(job) => {
              const claim = job as Claim
              setClaims((prev) => [...prev, claim])
              setSelectedClaim(claim)
              void fetchEvidence(claim.id)
            }}
            onJobDeleted={(jobId) => {
              const remaining = claims.filter((c) => c.id !== jobId)
              setClaims(remaining)
              const next = remaining[0] ?? null
              setSelectedClaim(next)
              if (next) void fetchEvidence(next.id)
              else setDocuments([])
            }}
            onSelect={(job) => {
              const claim = claims.find((c) => c.id === job.id)
              if (claim) setSelectedClaim(claim)
            }}
          />
          </div>
        </div>

        <main className="flex-1 min-w-0">
          <div className="w-full max-w-4xl mx-auto pb-8 safe-bottom space-y-4">
        {access.planName && access.role !== 'client' && (
          <p className="text-xs text-gray-600 text-center">
            {access.planName} plan
            {!isUnlimited(access.aiSummariesLimit) && (
              <>
                {' '}
                · AI {access.aiSummariesUsed}/{access.aiSummariesLimit} used this
                month
              </>
            )}
          </p>
        )}
        {access.downgradeReadOnly && access.downgradeNotice && (
          <p className="text-sm bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-3">
            {access.downgradeNotice} You can still open and download project files.
          </p>
        )}

        <div className="flex flex-wrap items-end gap-2 lg:hidden">
        <label className="block flex-1 min-w-[200px]">
          <span className="text-sm font-medium text-muted mb-1 block">
            Active job
          </span>
          <select
            className="input-field"
            value={selectedClaim?.id || ''}
            onChange={(e) => {
              const claim = claims.find((c) => c.id === e.target.value)
              if (claim) setSelectedClaim(claim)
            }}
          >
            {claims.map((c) => {
              const label =
                displayJobDescription(c.notes, projectNotes) || c.client_name
              return (
                <option key={c.id} value={c.id}>
                  {label} — {statusLabel(c.status, statusWorkflow)}
                </option>
              )
            })}
          </select>
        </label>
        {access.canCreateProject && (
          <button
            type="button"
            onClick={() => setAddJobOpen(true)}
            className="text-sm border border-border px-3 py-2 rounded-lg min-h-[40px] shrink-0"
          >
            Add a job
          </button>
        )}
        {access.canCreateProject && claims.length > 1 && activeClaim && (
          <button
            type="button"
            disabled={deletingJob}
            onClick={async () => {
              const label =
                displayJobDescription(activeClaim.notes, projectNotes) ||
                activeClaim.client_name
              const ok = window.confirm(
                `Delete "${label}" and all of its files, timeline entries, and status history? This cannot be undone.`
              )
              if (!ok) return
              setDeletingJob(true)
              const res = await fetch(
                `/api/projects/${id}/jobs/${activeClaim.id}`,
                { method: 'DELETE' }
              )
              const payload = await res.json().catch(() => ({}))
              setDeletingJob(false)
              if (!res.ok) {
                alert(payload.error || 'Could not delete job')
                return
              }
              const remaining = claims.filter((c) => c.id !== activeClaim.id)
              setClaims(remaining)
              const next = remaining[0] ?? null
              setSelectedClaim(next)
              if (next) void fetchEvidence(next.id)
              else setDocuments([])
            }}
            className="text-sm border border-red-300 text-red-800 bg-red-50 px-3 py-2 rounded-lg min-h-[40px] shrink-0 disabled:opacity-50"
          >
            {deletingJob ? 'Deleting…' : 'Delete job'}
          </button>
        )}
        </div>

        {addJobOpen && (
          <AddJobDialog
            projectId={id}
            onClose={() => setAddJobOpen(false)}
            onAdded={(job) => {
              const claim = job as Claim
              setClaims((prev) => [...prev, claim])
              setSelectedClaim(claim)
              setAddJobOpen(false)
              void fetchEvidence(claim.id)
            }}
          />
        )}

        <ProjectJobsList
          variant="summary"
          jobs={claims}
          projectId={id}
          legacyProjectNotes={projectNotes}
          workflow={statusWorkflow}
          selectedId={selectedClaim?.id ?? null}
          onSelect={(job) => {
            const claim = claims.find((c) => c.id === job.id)
            if (claim) setSelectedClaim(claim)
          }}
        />

        {configError && (
          <p className="text-sm text-red-700 border border-red-200 bg-red-50 p-3 rounded-xl">
            {configError}
          </p>
        )}

        <ClaimStatusWorkflow
          claimId={activeClaim.id}
          projectId={id}
          status={activeClaim.status}
          workflow={statusWorkflow}
          canEdit={access.canUpdateReportStatus}
          showReadOnlyHint={!isClientViewer}
          onStatusChange={(next: string) => {
            setClaims((prev) =>
              prev.map((c) =>
                c.id === activeClaim.id ? { ...c, status: next } : c
              )
            )
            setSelectedClaim((c) =>
              c?.id === activeClaim.id ? { ...c, status: next } : c
            )
            setTimelineRefreshKey((k) => k + 1)
          }}
          onMarkedCompleted={() => {
            if (access.canArchiveProject) setArchivePrompt(true)
          }}
        />

        {!isClientViewer && access.canViewTimeline && (
          <JobTimelinePanel
            claimId={activeClaim.id}
            projectId={id}
            jobLabel={activeClaim.client_name}
            timelineRefreshKey={timelineRefreshKey}
            canGenerate={access.canViewTimeline}
            aiSummariesLimit={access.aiSummariesLimit}
            aiSummariesUsed={access.aiSummariesUsed}
          />
        )}

        {access.canUploadEvidence && (
          <EvidenceUpload
            uploading={uploading}
            uploadMessage={uploadMessage}
            uploadProgress={uploadProgress}
            uploadProgressLabel={uploadProgressLabel}
            onUpload={uploadFile}
            onUploadMany={uploadMany}
          />
        )}

        {access.canViewFiles ? (
          <div id="project-documents" className="space-y-4">
            {access.role === 'admin' && (
              <AdminSignatureRequestsPanel projectId={id} />
            )}

            {isClientViewer && <ClientSignaturesPanel projectId={id} />}

            <input
              className="input-field w-full"
              placeholder="Search files, summaries, OCR text…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <EvidenceFolders
              documents={filtered}
              searchQuery={search}
              projectId={id}
              claimId={activeClaim.id}
              categories={fileCategories}
              canEdit={access.canEditEvidenceSummary}
              canDelete={access.canDeleteEvidence}
              canDownload={access.canDownloadFiles}
              canRescan={access.canUploadEvidence}
              emptyMessage={
                isClientViewer
                  ? 'No documents have been shared with you yet. Your contractor will select files for you to view.'
                  : undefined
              }
              focusFilePath={highlightFilePath}
              onFocusFilePathHandled={() => setHighlightFilePath(null)}
              onOpen={openFile}
              onDelete={deleteFile}
              onUpdated={() => fetchEvidence(activeClaim.id)}
            />
          </div>
        ) : (
          <p className="text-sm text-muted border border-border rounded-xl p-4">
            Your account cannot view project files. Contact your organization
            admin if you need access.
          </p>
        )}

        {access.canViewAiSummaryExport && (
          <ProjectAiExportSection
            claimId={activeClaim.id}
            projectId={id}
            jobLabel={activeClaim.client_name}
            canGenerate={access.canViewAiSummaryExport}
            canExportPdf={access.canExportPdf}
            canExportHtml={access.canExportHtml}
            aiSummariesLimit={access.aiSummariesLimit}
            aiSummariesUsed={access.aiSummariesUsed}
          />
        )}

        {access.canArchiveProject && (
          <ProjectArchivePanel
            projectId={id}
            projectName={activeClaim.client_name}
            jobCompleted={
              activeStatusKey !== null &&
              isCompletedStatus(activeStatusKey, statusWorkflow)
            }
            allJobsCompleted={allJobsCompleted}
            canArchive
            promptSave={archivePrompt}
            onPromptDismiss={() => setArchivePrompt(false)}
          />
        )}

        {(access.canViewInternalNotes || access.canViewCalendar) && (
          <div className="lg:hidden space-y-4">
            {access.canViewInternalNotes && (
              <InternalNotesPanel
                projectId={id}
                claimId={activeClaim.id}
                canPost={access.canUpdateClaimInfo}
              />
            )}
            {access.canViewCalendar && (
              <ProjectSchedulePanel
                projectId={id}
                canMarkComplete={
                  access.canManageSchedule && access.canUpdateClaimInfo
                }
                canManageEvents={access.canManageSchedule}
              />
            )}
          </div>
        )}
          </div>
        </main>

        {(access.canViewInternalNotes || access.canViewCalendar) && (
          <aside className="hidden lg:flex w-80 xl:w-96 shrink-0 flex-col gap-4">
            {access.canViewInternalNotes && (
              <div className="card-elevated p-4 shadow-sm">
                <InternalNotesPanel
                  variant="sidebar"
                  projectId={id}
                  claimId={activeClaim.id}
                  canPost={access.canUpdateClaimInfo}
                />
              </div>
            )}
            {access.canViewCalendar && (
              <div className="card-elevated p-4 shadow-sm">
                <ProjectSchedulePanel
                  variant="sidebar"
                  projectId={id}
                  canMarkComplete={
                    access.canManageSchedule && access.canUpdateClaimInfo
                  }
                  canManageEvents={access.canManageSchedule}
                />
              </div>
            )}
          </aside>
        )}
      </div>

      {!isClientViewer &&
        !access.workerBlockedByStaffLimit &&
        (access.role === 'admin' || access.canUseProjectAiChat) && (
        <ProjectAiChat
          projectId={id}
          aiSummariesLimit={access.aiSummariesLimit}
          aiSummariesUsed={access.aiSummariesUsed}
          onNavigateToDocument={(claimId, filePath) =>
            void navigateToDocument(claimId, filePath)
          }
          onUsageUpdated={() => void refreshAccess()}
        />
      )}
    </div>
  )
}

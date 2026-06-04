import { NextResponse } from 'next/server'
import { gatherProjectChatContext } from '@/lib/gather-project-chat-context'
import { generateProjectChatReply } from '@/lib/project-ai-chat-server'
import { consumeAiSummary } from '@/lib/plan-enforcement'
import { isOrganizationAdmin } from '@/lib/org-admin'
import { getOrgPlanContext } from '@/lib/org-plan'
import type { ProjectChatMessage } from '@/lib/project-chat-types'
import { getProjectWorkerPermissions } from '@/lib/project-worker-assignments'
import { canAccessStaffProjectFeatures } from '@/lib/staff-project-access'
import { requireAuth } from '@/lib/require-auth'
import { createServiceClient } from '@/lib/supabase/service'

export const maxDuration = 60

export async function POST(req: Request) {
  try {
    const { supabase, user } = await requireAuth()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const projectId = String(body.project_id || '')
    const messages = (body.messages || []) as ProjectChatMessage[]

    if (!projectId) {
      return NextResponse.json({ error: 'project_id required' }, { status: 400 })
    }

    if (!(await canAccessStaffProjectFeatures(supabase, projectId, user.id))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: project } = await supabase
      .from('projects')
      .select('organization_id')
      .eq('id', projectId)
      .maybeSingle()

    if (!project?.organization_id) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const isAdmin = await isOrganizationAdmin(
      supabase,
      project.organization_id,
      user.id
    )
    if (!isAdmin) {
      const workerPerms = await getProjectWorkerPermissions(
        supabase,
        projectId,
        user.id
      )
      if (!workerPerms?.can_use_ai_chat) {
        return NextResponse.json(
          { error: 'You do not have permission to use AI project chat.' },
          { status: 403 }
        )
      }
    }

    const planCtx = await getOrgPlanContext(supabase, project.organization_id)
    if (!planCtx) {
      return NextResponse.json(
        { error: 'Active subscription required for AI chat.' },
        { status: 403 }
      )
    }

    const aiCheck = await consumeAiSummary(
      project.organization_id,
      planCtx.entitlements
    )
    if (!aiCheck.ok) {
      return NextResponse.json(
        { error: aiCheck.error, used: aiCheck.used, limit: aiCheck.limit },
        { status: 403 }
      )
    }

    const storage = createServiceClient()
    const ctx = await gatherProjectChatContext(storage, projectId)
    if (!ctx) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const result = await generateProjectChatReply(ctx, messages)

    return NextResponse.json(result)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Chat failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

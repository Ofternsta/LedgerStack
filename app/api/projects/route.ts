import { NextResponse } from 'next/server'
import { createProjectForUser } from '@/lib/create-project-server'
import { loadUserAccessServer } from '@/lib/load-access-server'
import { requireAuth } from '@/lib/require-auth'

export async function POST(req: Request) {
  try {
    const { user } = await requireAuth()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { access } = await loadUserAccessServer()
    if (!access?.canCreateProject || !access.organizationId) {
      return NextResponse.json(
        { error: 'You do not have permission to create projects.' },
        { status: 403 }
      )
    }

    const body = await req.json().catch(() => ({}))
    const result = await createProjectForUser(user.id, access.organizationId, {
      customerName: String(body.customer_name || body.customerName || ''),
      projectAddress: String(
        body.project_address || body.projectAddress || ''
      ),
      notes: String(body.notes || ''),
    })

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ project: result.project })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Create project failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

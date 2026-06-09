import 'server-only'

import { NextResponse } from 'next/server'
import { DOWNGRADE_READ_ONLY_MESSAGE } from '@/lib/org-access-guards'
import { loadUserAccessServer } from '@/lib/load-access-server'

/** Staff (admin or approved worker) with an active org subscription. */
export async function requireStaffWithActivePlan():
  Promise<
    | { ok: true; userId: string; access: NonNullable<Awaited<ReturnType<typeof loadUserAccessServer>>['access']> }
    | { ok: false; response: NextResponse }
  > {
  const { userId, access } = await loadUserAccessServer()

  if (!userId || !access) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  if (access.role === 'client') {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    }
  }

  if (!access.organizationId || !access.plan) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'An active subscription is required.' },
        { status: 403 }
      ),
    }
  }

  if (access.downgradeReadOnly) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: DOWNGRADE_READ_ONLY_MESSAGE },
        { status: 403 }
      ),
    }
  }

  return { ok: true, userId, access }
}

'use client'

import { MessagePanel } from '@/components/message-panel'
import type { UserAccess } from '@/lib/roles'

type OrgTeamMessagesProps = {
  access: UserAccess
  userId: string | null
}

export function OrgTeamMessages({ access, userId }: OrgTeamMessagesProps) {
  const canSend =
    access.role === 'admin' ||
    (access.role === 'worker' && access.workerStatus === 'approved')

  if (access.role === 'client') return null

  if (access.role === 'worker' && access.workerStatus === 'pending') {
    return null
  }

  if (!access.organizationId && access.role !== 'admin') {
    return null
  }

  return (
    <MessagePanel
      channel="org_team"
      currentUserId={userId}
      title="Team messages"
      subtitle="Internal chat between admins and approved workers. Clients cannot see this."
      canSend={canSend}
      readOnlyHint={
        access.role === 'worker' && access.workerStatus !== 'approved'
          ? 'You can read team messages after admin approval.'
          : undefined
      }
    />
  )
}

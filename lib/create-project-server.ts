import 'server-only'

import { DEFAULT_CLAIM_STATUS } from '@/lib/claim-status'
import { assertCanCreateProject } from '@/lib/plan-enforcement'
import { createServiceClient } from '@/lib/supabase/service'

export type CreateProjectInput = {
  customerName: string
  projectAddress: string
  notes?: string
}

async function userMayCreateInOrg(userId: string, organizationId: string) {
  const service = createServiceClient()

  const { data: org } = await service
    .from('organizations')
    .select('admin_user_id')
    .eq('id', organizationId)
    .maybeSingle()

  if (org?.admin_user_id === userId) return true

  const { data: membership } = await service
    .from('organization_members')
    .select('status')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .maybeSingle()

  return membership?.status === 'approved'
}

export async function createProjectForUser(
  userId: string,
  organizationId: string,
  input: CreateProjectInput
) {
  const customerName = input.customerName.trim()
  const projectAddress = input.projectAddress.trim()
  const notes = input.notes?.trim() || ''

  if (!customerName || !projectAddress) {
    return { error: 'Customer name and project address are required.' }
  }

  if (!(await userMayCreateInOrg(userId, organizationId))) {
    return {
      error:
        'You are not allowed to create projects for this organization. Workers must be approved by an admin.',
    }
  }

  const service = createServiceClient()

  const projectCheck = await assertCanCreateProject(service, organizationId)
  if (!projectCheck.ok) {
    return { error: projectCheck.error }
  }

  const { data: project, error: projectError } = await service
    .from('projects')
    .insert({
      customer_name: customerName,
      project_address: projectAddress,
      notes,
      user_id: userId,
      organization_id: organizationId,
    })
    .select('id, customer_name, project_address, notes')
    .single()

  if (projectError || !project) {
    return {
      error:
        projectError?.message ||
        'Could not create project. Run supabase/projects-rls-fix.sql in Supabase.',
    }
  }

  const { data: claimRows, error: claimError } = await service
    .from('claims')
    .insert({
      project_id: project.id,
      client_name: customerName,
      property_address: projectAddress,
      loss_type: 'Property',
      insurance_company: 'Unknown',
      claim_number: `AUTO-${Date.now()}`,
      status: DEFAULT_CLAIM_STATUS,
      notes: 'Auto claim',
    })
    .select('id')

  if (claimError || !claimRows?.length) {
    await service.from('projects').delete().eq('id', project.id)
    return {
      error: claimError?.message || 'Project created but claim could not be saved.',
    }
  }

  return { project }
}

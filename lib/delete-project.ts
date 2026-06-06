/** @deprecated Use DELETE /api/projects/[id] instead. */
export async function deleteProject(_projectId: string): Promise<string | null> {
  return (
    'Project delete must go through the server API. Update the caller to use DELETE /api/projects/[id].'
  )
}

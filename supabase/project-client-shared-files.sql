-- Per-client file sharing: which project files a client may view.
-- Run in Supabase SQL Editor after project_client_access exists.

CREATE TABLE IF NOT EXISTS public.project_client_shared_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_client_access_id uuid NOT NULL
    REFERENCES public.project_client_access (id) ON DELETE CASCADE,
  file_path text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_client_access_id, file_path)
);

CREATE INDEX IF NOT EXISTS project_client_shared_files_access_idx
  ON public.project_client_shared_files (project_client_access_id);

ALTER TABLE public.project_client_shared_files ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_client_shared_files TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_client_shared_files TO service_role;

DROP POLICY IF EXISTS "admin manage client shared files" ON public.project_client_shared_files;
CREATE POLICY "admin manage client shared files"
  ON public.project_client_shared_files FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.project_client_access pca
      JOIN public.projects p ON p.id = pca.project_id
      WHERE pca.id = project_client_shared_files.project_client_access_id
        AND public.is_org_admin(p.organization_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.project_client_access pca
      JOIN public.projects p ON p.id = pca.project_id
      WHERE pca.id = project_client_shared_files.project_client_access_id
        AND public.is_org_admin(p.organization_id)
    )
  );

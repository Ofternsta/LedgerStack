-- Ensure clients see shared projects (homepage + RLS).
-- Run in Supabase SQL Editor if clients have approved rows but no projects in the app.

-- Case-insensitive client email on access rows
DROP POLICY IF EXISTS "client read own access" ON public.project_client_access;
CREATE POLICY "client read own access"
  ON public.project_client_access FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR lower(client_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

-- can_access_project must include approved clients (email or user_id)
CREATE OR REPLACE FUNCTION public.can_access_project(pid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = pid
      AND (
        public.is_org_admin(p.organization_id)
        OR (
          public.is_approved_worker(p.organization_id)
          AND public.is_worker_assigned_to_project(pid)
        )
        OR EXISTS (
          SELECT 1 FROM public.project_client_access pca
          WHERE pca.project_id = pid
            AND pca.status = 'approved'
            AND (
              pca.user_id = auth.uid()
              OR lower(pca.client_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
            )
        )
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.can_access_project(uuid) TO authenticated;

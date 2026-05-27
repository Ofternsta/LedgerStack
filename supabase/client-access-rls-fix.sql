-- Case-insensitive client email match for project_client_access (SELECT policy).
-- Run in Supabase SQL Editor if clients cannot load project access rows.

DROP POLICY IF EXISTS "client read own access" ON public.project_client_access;
CREATE POLICY "client read own access"
  ON public.project_client_access FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR lower(client_email) = lower(auth.jwt() ->> 'email')
  );

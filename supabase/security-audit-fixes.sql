-- Security audit remediation (run in Supabase SQL Editor after existing migrations).
-- Consolidates fixes for RLS gaps, AI usage atomicity, stored AI summaries, and rate limits.

-- ---------------------------------------------------------------------------
-- Atomic AI usage increment (returns new count, or NULL if at/over cap)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.try_increment_ai_usage(
  org_id uuid,
  month text,
  cap integer
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_count integer;
BEGIN
  IF cap IS NULL OR cap < 0 THEN
    RETURN -1;
  END IF;

  INSERT INTO public.organization_ai_usage (organization_id, month_key, summaries_used, updated_at)
  VALUES (org_id, month, 1, now())
  ON CONFLICT (organization_id, month_key)
  DO UPDATE SET
    summaries_used = public.organization_ai_usage.summaries_used + 1,
    updated_at = now()
  WHERE public.organization_ai_usage.summaries_used < cap
  RETURNING summaries_used INTO new_count;

  RETURN new_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.decrement_ai_usage(org_id uuid, month text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.organization_ai_usage
  SET summaries_used = GREATEST(0, summaries_used - 1),
      updated_at = now()
  WHERE organization_id = org_id
    AND month_key = month
    AND summaries_used > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.try_increment_ai_usage(uuid, text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.decrement_ai_usage(uuid, text) TO service_role;

-- ---------------------------------------------------------------------------
-- API rate limiting (public auth endpoints)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.api_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket text NOT NULL,
  rate_key text NOT NULL,
  hit_count integer NOT NULL DEFAULT 1,
  window_started_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (bucket, rate_key)
);

ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.api_rate_limits TO service_role;

-- ---------------------------------------------------------------------------
-- Server-stored job AI summaries (replaces browser localStorage)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.job_ai_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  claim_id uuid NOT NULL REFERENCES public.claims(id) ON DELETE CASCADE,
  report jsonb NOT NULL,
  generated_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  generated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, claim_id)
);

CREATE INDEX IF NOT EXISTS job_ai_summaries_org_idx
  ON public.job_ai_summaries (organization_id);

ALTER TABLE public.job_ai_summaries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff read job ai summaries" ON public.job_ai_summaries;
CREATE POLICY "staff read job ai summaries"
  ON public.job_ai_summaries FOR SELECT TO authenticated
  USING (
    public.is_org_admin(organization_id)
    OR (
      public.is_worker_assigned_to_project(project_id)
      AND public.member_has_project_permission(project_id, 'view_files')
    )
  );

DROP POLICY IF EXISTS "staff write job ai summaries" ON public.job_ai_summaries;
CREATE POLICY "staff write job ai summaries"
  ON public.job_ai_summaries FOR INSERT TO authenticated
  WITH CHECK (
    generated_by = auth.uid()
    AND (
      public.is_org_admin(organization_id)
      OR (
        public.is_worker_assigned_to_project(project_id)
        AND (
          public.member_has_project_permission(project_id, 'upload')
          OR public.member_has_project_permission(project_id, 'add_events')
          OR public.member_has_project_permission(project_id, 'view_files')
        )
      )
    )
  );

DROP POLICY IF EXISTS "staff update job ai summaries" ON public.job_ai_summaries;
CREATE POLICY "staff update job ai summaries"
  ON public.job_ai_summaries FOR UPDATE TO authenticated
  USING (
    public.is_org_admin(organization_id)
    OR (
      public.is_worker_assigned_to_project(project_id)
      AND (
        public.member_has_project_permission(project_id, 'upload')
        OR public.member_has_project_permission(project_id, 'add_events')
        OR public.member_has_project_permission(project_id, 'view_files')
      )
    )
  )
  WITH CHECK (
    generated_by = auth.uid()
    AND (
      public.is_org_admin(organization_id)
      OR (
        public.is_worker_assigned_to_project(project_id)
        AND (
          public.member_has_project_permission(project_id, 'upload')
          OR public.member_has_project_permission(project_id, 'add_events')
          OR public.member_has_project_permission(project_id, 'view_files')
        )
      )
    )
  );

GRANT SELECT, INSERT, UPDATE ON public.job_ai_summaries TO authenticated;
GRANT ALL ON public.job_ai_summaries TO service_role;

-- ---------------------------------------------------------------------------
-- Org admin profile role: prevent workers becoming admin via profile update
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "org admin update member profiles" ON public.profiles;
CREATE POLICY "org admin update member profiles"
  ON public.profiles FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members m
      JOIN public.organizations o ON o.id = m.organization_id
      WHERE m.user_id = profiles.id
        AND o.admin_user_id = auth.uid()
        AND m.status = 'approved'
    )
  )
  WITH CHECK (
    role = (SELECT p.role FROM public.profiles p WHERE p.id = profiles.id)
    AND EXISTS (
      SELECT 1 FROM public.organization_members m
      JOIN public.organizations o ON o.id = m.organization_id
      WHERE m.user_id = profiles.id
        AND o.admin_user_id = auth.uid()
        AND m.status = 'approved'
    )
  );

-- ---------------------------------------------------------------------------
-- Projects: creator cannot update rows they cannot read; pin organization_id
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "creator update own projects" ON public.projects;
CREATE POLICY "creator update own projects"
  ON public.projects FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    AND public.can_access_project(id)
  )
  WITH CHECK (
    user_id = auth.uid()
    AND organization_id = (SELECT p.organization_id FROM public.projects p WHERE p.id = projects.id)
  );

-- ---------------------------------------------------------------------------
-- Schedule events: require project assignment + add_events permission
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "staff insert schedule" ON public.schedule_events;
CREATE POLICY "staff insert schedule"
  ON public.schedule_events FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND public.is_org_staff_for_project(project_id)
    AND public.member_has_project_permission(project_id, 'add_events')
    AND EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id AND p.organization_id = schedule_events.organization_id
    )
  );

DROP POLICY IF EXISTS "staff update schedule" ON public.schedule_events;
CREATE POLICY "staff update schedule"
  ON public.schedule_events FOR UPDATE TO authenticated
  USING (
    public.is_org_staff_for_project(project_id)
    AND public.member_has_project_permission(project_id, 'add_events')
  )
  WITH CHECK (
    public.is_org_staff_for_project(project_id)
    AND public.member_has_project_permission(project_id, 'add_events')
  );

DROP POLICY IF EXISTS "staff delete schedule" ON public.schedule_events;
CREATE POLICY "staff delete schedule"
  ON public.schedule_events FOR DELETE TO authenticated
  USING (
    public.is_org_staff_for_project(project_id)
    AND public.member_has_project_permission(project_id, 'add_events')
  );

-- ---------------------------------------------------------------------------
-- Claims timeline: require project assignment for workers
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "staff manage claim timeline" ON public.claim_timeline_events;
CREATE POLICY "staff manage claim timeline"
  ON public.claim_timeline_events FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.claims c
      WHERE c.id = claim_timeline_events.claim_id
        AND public.can_access_project(c.project_id)
        AND (
          public.is_org_admin((SELECT organization_id FROM public.projects WHERE id = c.project_id))
          OR public.is_worker_assigned_to_project(c.project_id)
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.claims c
      WHERE c.id = claim_timeline_events.claim_id
        AND public.can_access_project(c.project_id)
        AND (
          public.is_org_admin((SELECT organization_id FROM public.projects WHERE id = c.project_id))
          OR public.is_worker_assigned_to_project(c.project_id)
        )
    )
  );

-- ---------------------------------------------------------------------------
-- Claims insert: workers must be assigned to the project
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "staff insert claims" ON public.claims;
CREATE POLICY "staff insert claims"
  ON public.claims FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = claims.project_id
        AND (
          public.is_org_admin(p.organization_id)
          OR (
            public.is_worker_assigned_to_project(p.id)
            AND public.member_has_project_permission(p.id, 'upload')
          )
        )
    )
  );

-- ---------------------------------------------------------------------------
-- Storage: client file access uses project permission (not blanket true)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_view_project_files(project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN NOT public.can_access_project(project_id) THEN false
    WHEN EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id AND public.is_org_admin(p.organization_id)
    ) THEN true
    WHEN EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id AND public.is_approved_worker(p.organization_id)
    ) THEN public.member_has_project_permission(project_id, 'view_files')
    ELSE false
  END;
$$;

-- ---------------------------------------------------------------------------
-- Dangerous legacy policies (idempotent cleanup)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "anon select projects" ON public.projects;
DROP POLICY IF EXISTS "anon insert projects" ON public.projects;
DROP POLICY IF EXISTS "anon delete projects" ON public.projects;
DROP POLICY IF EXISTS "allow_select_all" ON public.projects;
DROP POLICY IF EXISTS "allow_insert_all" ON public.projects;
DROP POLICY IF EXISTS "allow_delete_all" ON public.projects;
DROP POLICY IF EXISTS "allow_update_all" ON public.projects;
DROP POLICY IF EXISTS "anon select claims" ON public.claims;
DROP POLICY IF EXISTS "anon insert claims" ON public.claims;
DROP POLICY IF EXISTS "anon delete claims" ON public.claims;
DROP POLICY IF EXISTS "allow_select_all" ON public.claims;
DROP POLICY IF EXISTS "allow_insert_all" ON public.claims;
DROP POLICY IF EXISTS "allow_delete_all" ON public.claims;
DROP POLICY IF EXISTS "allow_update_all" ON public.claims;
DROP POLICY IF EXISTS "anyone read org by invite code" ON public.organizations;

REVOKE ALL ON TABLE public.projects FROM anon;
REVOKE ALL ON TABLE public.claims FROM anon;

DROP POLICY IF EXISTS "authenticated read project files" ON storage.objects;
DROP POLICY IF EXISTS "authenticated insert project files" ON storage.objects;
DROP POLICY IF EXISTS "authenticated update project files" ON storage.objects;
DROP POLICY IF EXISTS "authenticated delete project files" ON storage.objects;
DROP POLICY IF EXISTS "anon read project files" ON storage.objects;
DROP POLICY IF EXISTS "anon insert project files" ON storage.objects;
DROP POLICY IF EXISTS "anon update project files" ON storage.objects;
DROP POLICY IF EXISTS "anon delete project files" ON storage.objects;

-- Re-apply project-scoped storage policies (requires project-worker-permissions.sql helpers).
CREATE OR REPLACE FUNCTION public.storage_project_id(object_name text)
RETURNS uuid
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT NULLIF(split_part(object_name, '/', 1), '')::uuid;
$$;

DROP POLICY IF EXISTS "authenticated read project files" ON storage.objects;
CREATE POLICY "authenticated read project files"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'project-files'
    AND public.can_view_project_files(public.storage_project_id(name))
  );

DROP POLICY IF EXISTS "staff upload project files" ON storage.objects;
CREATE POLICY "staff upload project files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'project-files'
    AND public.member_has_project_permission(
      public.storage_project_id(name),
      'upload'
    )
  );

DROP POLICY IF EXISTS "staff update project files" ON storage.objects;
CREATE POLICY "staff update project files"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'project-files'
    AND public.member_has_project_permission(
      public.storage_project_id(name),
      'upload'
    )
  )
  WITH CHECK (
    bucket_id = 'project-files'
    AND public.member_has_project_permission(
      public.storage_project_id(name),
      'upload'
    )
  );

DROP POLICY IF EXISTS "staff delete project files" ON storage.objects;
CREATE POLICY "staff delete project files"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'project-files'
    AND public.member_has_project_permission(
      public.storage_project_id(name),
      'delete'
    )
  );

-- Run in Supabase SQL Editor (after roles-and-orgs.sql and messaging.sql)

-- Schedule / calendar events (per project, optional claim)
CREATE TABLE IF NOT EXISTS public.schedule_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects (id) ON DELETE CASCADE,
  claim_id uuid REFERENCES public.claims (id) ON DELETE SET NULL,
  event_type text NOT NULL CHECK (
    event_type IN (
      'inspection',
      'deadline',
      'reminder',
      'insurance_followup',
      'assignment',
      'other'
    )
  ),
  title text NOT NULL CHECK (char_length(trim(title)) > 0),
  description text,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  assigned_user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  reminder_at timestamptz,
  completed_at timestamptz,
  created_by uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS schedule_events_project_idx
  ON public.schedule_events (project_id, starts_at);

CREATE INDEX IF NOT EXISTS schedule_events_org_starts_idx
  ON public.schedule_events (organization_id, starts_at);

CREATE INDEX IF NOT EXISTS schedule_events_assigned_idx
  ON public.schedule_events (assigned_user_id, starts_at)
  WHERE assigned_user_id IS NOT NULL;

-- Internal notes / team log (per project, optional claim)
CREATE TABLE IF NOT EXISTS public.internal_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects (id) ON DELETE CASCADE,
  claim_id uuid REFERENCES public.claims (id) ON DELETE SET NULL,
  author_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(trim(body)) > 0 AND char_length(body) <= 8000),
  mentioned_user_ids uuid[] NOT NULL DEFAULT '{}',
  note_kind text NOT NULL DEFAULT 'note' CHECK (
    note_kind IN ('note', 'status_update', 'mention')
  ),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS internal_notes_project_idx
  ON public.internal_notes (project_id, created_at DESC);

CREATE INDEX IF NOT EXISTS internal_notes_claim_idx
  ON public.internal_notes (claim_id, created_at DESC)
  WHERE claim_id IS NOT NULL;

ALTER TABLE public.schedule_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internal_notes ENABLE ROW LEVEL SECURITY;

-- Staff = org admin or approved worker; clients excluded
CREATE OR REPLACE FUNCTION public.is_org_staff_for_project(pid uuid)
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
        OR public.is_approved_worker(p.organization_id)
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_org_staff_for_project(uuid) TO authenticated;

-- schedule_events policies
DROP POLICY IF EXISTS "staff read schedule" ON public.schedule_events;
CREATE POLICY "staff read schedule"
  ON public.schedule_events FOR SELECT TO authenticated
  USING (public.is_org_staff_for_project(project_id));

DROP POLICY IF EXISTS "staff insert schedule" ON public.schedule_events;
CREATE POLICY "staff insert schedule"
  ON public.schedule_events FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND public.is_org_staff_for_project(project_id)
    AND EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id AND p.organization_id = schedule_events.organization_id
    )
  );

DROP POLICY IF EXISTS "staff update schedule" ON public.schedule_events;
CREATE POLICY "staff update schedule"
  ON public.schedule_events FOR UPDATE TO authenticated
  USING (public.is_org_staff_for_project(project_id))
  WITH CHECK (public.is_org_staff_for_project(project_id));

DROP POLICY IF EXISTS "admin delete schedule" ON public.schedule_events;
CREATE POLICY "admin delete schedule"
  ON public.schedule_events FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = schedule_events.project_id
        AND public.is_org_admin(p.organization_id)
    )
  );

-- internal_notes policies
DROP POLICY IF EXISTS "staff read internal notes" ON public.internal_notes;
CREATE POLICY "staff read internal notes"
  ON public.internal_notes FOR SELECT TO authenticated
  USING (public.is_org_staff_for_project(project_id));

DROP POLICY IF EXISTS "staff insert internal notes" ON public.internal_notes;
CREATE POLICY "staff insert internal notes"
  ON public.internal_notes FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND public.is_org_staff_for_project(project_id)
    AND EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id AND p.organization_id = internal_notes.organization_id
    )
  );

DROP POLICY IF EXISTS "author update internal notes" ON public.internal_notes;
CREATE POLICY "author update internal notes"
  ON public.internal_notes FOR UPDATE TO authenticated
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS "admin delete internal notes" ON public.internal_notes;
CREATE POLICY "admin delete internal notes"
  ON public.internal_notes FOR DELETE TO authenticated
  USING (
    author_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = internal_notes.project_id
        AND public.is_org_admin(p.organization_id)
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.schedule_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.internal_notes TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.schedule_events TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.internal_notes TO service_role;

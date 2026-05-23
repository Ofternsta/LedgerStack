-- Run after roles-and-orgs.sql
-- Messaging: org_team (admin + workers) and project (admin, workers, clients on a project)

CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects (id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('org_team', 'project')),
  sender_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(trim(body)) > 0 AND char_length(body) <= 4000),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT messages_channel_project CHECK (
    (channel = 'org_team' AND project_id IS NULL)
    OR (channel = 'project' AND project_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS messages_org_team_idx
  ON public.messages (organization_id, created_at DESC)
  WHERE channel = 'org_team';

CREATE INDEX IF NOT EXISTS messages_project_idx
  ON public.messages (project_id, created_at DESC)
  WHERE channel = 'project';

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Read org team messages: admin or approved worker in org
DROP POLICY IF EXISTS "org team read messages" ON public.messages;
CREATE POLICY "org team read messages"
  ON public.messages FOR SELECT TO authenticated
  USING (
    channel = 'org_team'
    AND (
      public.is_org_admin(organization_id)
      OR public.is_approved_worker(organization_id)
    )
  );

-- Read project messages: anyone who can access the project
DROP POLICY IF EXISTS "project read messages" ON public.messages;
CREATE POLICY "project read messages"
  ON public.messages FOR SELECT TO authenticated
  USING (
    channel = 'project'
    AND project_id IS NOT NULL
    AND public.can_access_project(project_id)
  );

-- Send org team messages
DROP POLICY IF EXISTS "org team send messages" ON public.messages;
CREATE POLICY "org team send messages"
  ON public.messages FOR INSERT TO authenticated
  WITH CHECK (
    channel = 'org_team'
    AND sender_id = auth.uid()
    AND (
      public.is_org_admin(organization_id)
      OR public.is_approved_worker(organization_id)
    )
  );

-- Send project messages
DROP POLICY IF EXISTS "project send messages" ON public.messages;
CREATE POLICY "project send messages"
  ON public.messages FOR INSERT TO authenticated
  WITH CHECK (
    channel = 'project'
    AND sender_id = auth.uid()
    AND project_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
        AND p.organization_id = messages.organization_id
        AND public.can_access_project(project_id)
    )
  );

GRANT SELECT, INSERT ON public.messages TO authenticated;

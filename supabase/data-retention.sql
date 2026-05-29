-- Data retention: completed_at, project activity, org status labels & worker defaults
-- Run in Supabase SQL Editor after roles-and-orgs.sql

ALTER TABLE public.claims
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS last_activity_at timestamptz NOT NULL DEFAULT now();

UPDATE public.projects
SET last_activity_at = COALESCE(created_at, now())
WHERE last_activity_at IS NULL;

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS claim_status_labels jsonb,
  ADD COLUMN IF NOT EXISTS default_worker_permissions jsonb;

COMMENT ON COLUMN public.claims.completed_at IS
  'Set when status becomes Completed; used for 7-day project purge.';

COMMENT ON COLUMN public.projects.last_activity_at IS
  'Updated on project activity; inactive non-completed projects purge after 12 months.';

CREATE INDEX IF NOT EXISTS claims_completed_at_idx
  ON public.claims (completed_at)
  WHERE completed_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS projects_last_activity_at_idx
  ON public.projects (last_activity_at);

UPDATE public.claims
SET completed_at = now()
WHERE status = 'Completed' AND completed_at IS NULL;

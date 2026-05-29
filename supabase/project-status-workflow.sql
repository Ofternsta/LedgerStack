-- Per-project status workflow (variable stages). Run after claim-status-workflow.sql.

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS status_workflow jsonb;

ALTER TABLE public.claims DROP CONSTRAINT IF EXISTS claims_status_check;

-- Backfill default workflow on projects
UPDATE public.projects
SET status_workflow = jsonb_build_object(
  'stages',
  jsonb_build_array(
    jsonb_build_object('key', 'inspection', 'label', 'Inspection'),
    jsonb_build_object('key', 'documentation', 'label', 'Documentation'),
    jsonb_build_object('key', 'estimate_sent', 'label', 'Estimate Sent'),
    jsonb_build_object('key', 'approved', 'label', 'Approved'),
    jsonb_build_object('key', 'in_progress', 'label', 'In Progress'),
    jsonb_build_object('key', 'completed', 'label', 'Completed')
  )
)
WHERE status_workflow IS NULL;

-- Map legacy claim status labels to stable keys
UPDATE public.claims SET status = 'inspection' WHERE status IN ('Inspection', 'inspection');
UPDATE public.claims SET status = 'documentation' WHERE status IN ('Documentation', 'documentation');
UPDATE public.claims SET status = 'estimate_sent' WHERE status IN ('Estimate Sent', 'estimate_sent');
UPDATE public.claims SET status = 'approved' WHERE status IN ('Approved', 'approved');
UPDATE public.claims SET status = 'in_progress' WHERE status IN ('In Progress', 'in_progress');
UPDATE public.claims SET status = 'completed' WHERE status IN ('Completed', 'completed');

UPDATE public.claims
SET status = 'inspection'
WHERE status IS NULL OR trim(status) = '';

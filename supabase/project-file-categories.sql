-- Per-project file category folders. Run after project-status-workflow.sql.
-- Or run supabase/rename-default-file-categories.sql alone (adds column + same defaults).

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS file_categories jsonb;

UPDATE public.projects
SET file_categories = jsonb_build_object(
  'categories',
  jsonb_build_array(
    jsonb_build_object('key', 'site_photo', 'label', 'Site Photo'),
    jsonb_build_object('key', 'invoice', 'label', 'Invoice'),
    jsonb_build_object('key', 'estimate', 'label', 'Estimate'),
    jsonb_build_object('key', 'measurements', 'label', 'Measurements'),
    jsonb_build_object('key', 'correspondence', 'label', 'Correspondence'),
    jsonb_build_object('key', 'documents', 'label', 'Documents'),
    jsonb_build_object('key', 'other', 'label', 'Other')
  )
)
WHERE file_categories IS NULL;

-- Per-project file category folders. Run after project-status-workflow.sql.

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS file_categories jsonb;

UPDATE public.projects
SET file_categories = jsonb_build_object(
  'categories',
  jsonb_build_array(
    jsonb_build_object('key', 'damage_photo', 'label', 'Damage Photo'),
    jsonb_build_object('key', 'invoice', 'label', 'Invoice'),
    jsonb_build_object('key', 'estimate', 'label', 'Estimate'),
    jsonb_build_object('key', 'moisture_reading', 'label', 'Moisture Reading'),
    jsonb_build_object('key', 'insurance_email', 'label', 'Insurance Email'),
    jsonb_build_object('key', 'report', 'label', 'Report'),
    jsonb_build_object('key', 'other', 'label', 'Other')
  )
)
WHERE file_categories IS NULL;

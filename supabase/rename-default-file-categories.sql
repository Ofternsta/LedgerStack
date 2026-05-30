-- Rename legacy default file category labels (restoration-era defaults).
-- Run once in Supabase SQL Editor after project-file-categories.sql.

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
WHERE file_categories IS NOT NULL
  AND file_categories::text LIKE '%Damage Photo%';

UPDATE public.claim_evidence
SET evidence_type = 'Site Photo'
WHERE evidence_type = 'Damage Photo';

UPDATE public.claim_evidence
SET evidence_type = 'Measurements'
WHERE evidence_type = 'Moisture Reading';

UPDATE public.claim_evidence
SET evidence_type = 'Correspondence'
WHERE evidence_type = 'Insurance Email';

UPDATE public.claim_evidence
SET evidence_type = 'Documents'
WHERE evidence_type = 'Report';

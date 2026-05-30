-- Default file category labels (contractor-friendly names).
-- Run the entire file in Supabase SQL Editor (select all, then Run).

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS file_categories jsonb;

UPDATE public.projects
SET file_categories = '{"categories":[{"key":"site_photo","label":"Site Photo"},{"key":"invoice","label":"Invoice"},{"key":"estimate","label":"Estimate"},{"key":"measurements","label":"Measurements"},{"key":"correspondence","label":"Correspondence"},{"key":"documents","label":"Documents"},{"key":"other","label":"Other"}]}'::jsonb
WHERE file_categories IS NULL;

UPDATE public.projects
SET file_categories = '{"categories":[{"key":"site_photo","label":"Site Photo"},{"key":"invoice","label":"Invoice"},{"key":"estimate","label":"Estimate"},{"key":"measurements","label":"Measurements"},{"key":"correspondence","label":"Correspondence"},{"key":"documents","label":"Documents"},{"key":"other","label":"Other"}]}'::jsonb
WHERE file_categories::text LIKE '%Damage Photo%';

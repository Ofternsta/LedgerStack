-- ⚠️ DEPRECATED — DO NOT RUN ON PRODUCTION
-- These policies allow the anon role to read/write/delete all files in project-files.
-- Production should use authenticated storage policies (see security-audit-fixes.sql).
-- Run in Supabase SQL Editor if uploads fail with "row-level security" or permission errors
-- Bucket name must be: project-files

-- Allow anon to upload, read, update, and delete files in project-files
DROP POLICY IF EXISTS "anon upload project files" ON storage.objects;
CREATE POLICY "anon upload project files"
  ON storage.objects FOR INSERT TO anon
  WITH CHECK (bucket_id = 'project-files');

DROP POLICY IF EXISTS "anon read project files" ON storage.objects;
CREATE POLICY "anon read project files"
  ON storage.objects FOR SELECT TO anon
  USING (bucket_id = 'project-files');

DROP POLICY IF EXISTS "anon update project files" ON storage.objects;
CREATE POLICY "anon update project files"
  ON storage.objects FOR UPDATE TO anon
  USING (bucket_id = 'project-files')
  WITH CHECK (bucket_id = 'project-files');

DROP POLICY IF EXISTS "anon delete project files" ON storage.objects;
CREATE POLICY "anon delete project files"
  ON storage.objects FOR DELETE TO anon
  USING (bucket_id = 'project-files');

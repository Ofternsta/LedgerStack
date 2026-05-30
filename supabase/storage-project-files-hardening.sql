-- Fix insecure project-files storage policies (run once in Supabase SQL Editor)
--
-- BEFORE running:
-- 1. Dashboard → Storage → project-files → set bucket to PRIVATE (not Public)
-- 2. Prerequisites: roles-and-orgs.sql, client-projects-access.sql,
--    project-worker-assignments.sql, project-worker-permissions.sql
--
-- This removes anon + bucket-wide authenticated policies and applies
-- project-scoped RLS (path: {projectId}/{claimId}/filename).

CREATE OR REPLACE FUNCTION public.storage_project_id(object_name text)
RETURNS uuid
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT NULLIF(split_part(object_name, '/', 1), '')::uuid;
$$;

-- ── Remove legacy / insecure policies ─────────────────────────────────────

DROP POLICY IF EXISTS "allow read" ON storage.objects;
DROP POLICY IF EXISTS "allow upload" ON storage.objects;
DROP POLICY IF EXISTS "allow delete" ON storage.objects;
DROP POLICY IF EXISTS "allow update" ON storage.objects;

DROP POLICY IF EXISTS "anon read project files" ON storage.objects;
DROP POLICY IF EXISTS "anon upload project files" ON storage.objects;
DROP POLICY IF EXISTS "anon update project files" ON storage.objects;
DROP POLICY IF EXISTS "anon delete project files" ON storage.objects;

DROP POLICY IF EXISTS "authenticated read project files" ON storage.objects;
DROP POLICY IF EXISTS "authenticated upload project files" ON storage.objects;
DROP POLICY IF EXISTS "authenticated update project files" ON storage.objects;
DROP POLICY IF EXISTS "authenticated delete project files" ON storage.objects;

DROP POLICY IF EXISTS "admin delete project files" ON storage.objects;

DROP POLICY IF EXISTS "staff upload project files" ON storage.objects;
DROP POLICY IF EXISTS "staff update project files" ON storage.objects;
DROP POLICY IF EXISTS "staff delete project files" ON storage.objects;

-- ── Project-scoped policies (authenticated users only) ────────────────────

-- Read/list/download: admins, assigned workers (with view_files), approved clients
CREATE POLICY "authenticated read project files"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'project-files'
    AND public.can_view_project_files(public.storage_project_id(name))
  );

-- Upload: admin or worker with per-project upload permission
CREATE POLICY "staff upload project files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'project-files'
    AND public.member_has_project_permission(
      public.storage_project_id(name),
      'upload'
    )
  );

-- Update (e.g. metadata sidecars): same as upload permission
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

-- Delete: admin or worker with per-project delete permission
CREATE POLICY "staff delete project files"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'project-files'
    AND public.member_has_project_permission(
      public.storage_project_id(name),
      'delete'
    )
  );

-- Worker download permission (run in Supabase SQL Editor).
-- After worker-permissions.sql, project-worker-permissions.sql, and worker-ai-chat-permission.sql.

ALTER TABLE public.organization_members
  ADD COLUMN IF NOT EXISTS can_download_files boolean NOT NULL DEFAULT true;

ALTER TABLE public.project_worker_assignments
  ADD COLUMN IF NOT EXISTS can_download_files boolean NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION public.member_has_org_permission(org_id uuid, perm text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN public.is_org_admin(org_id) THEN true
    ELSE EXISTS (
      SELECT 1
      FROM public.organization_members m
      WHERE m.organization_id = org_id
        AND m.user_id = auth.uid()
        AND m.status = 'approved'
        AND CASE perm
          WHEN 'upload' THEN m.can_upload
          WHEN 'delete' THEN m.can_delete
          WHEN 'add_events' THEN m.can_add_events
          WHEN 'view_files' THEN m.can_view_files
          WHEN 'download_files' THEN m.can_download_files
          WHEN 'ai_chat' THEN m.can_use_ai_chat
          ELSE false
        END
    )
  END;
$$;

CREATE OR REPLACE FUNCTION public.member_has_project_permission(pid uuid, perm text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN NOT public.can_access_project(pid) THEN false
    WHEN EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = pid AND public.is_org_admin(p.organization_id)
    ) THEN true
    ELSE EXISTS (
      SELECT 1
      FROM public.project_worker_assignments pwa
      WHERE pwa.project_id = pid
        AND pwa.user_id = auth.uid()
        AND CASE perm
          WHEN 'upload' THEN pwa.can_upload
          WHEN 'delete' THEN pwa.can_delete
          WHEN 'add_events' THEN pwa.can_add_events
          WHEN 'view_files' THEN pwa.can_view_files
          WHEN 'download_files' THEN pwa.can_download_files
          WHEN 'ai_chat' THEN pwa.can_use_ai_chat
          ELSE false
        END
    )
  END;
$$;

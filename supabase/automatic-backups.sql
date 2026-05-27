-- Automatic organization backups (admin-only). Run after roles-and-orgs.sql.
-- Create bucket in Dashboard → Storage → New bucket: org-backups (private), or run the insert below.

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('org-backups', 'org-backups', false, 524288000)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS backup_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS backup_frequency text NOT NULL DEFAULT 'weekly'
    CHECK (backup_frequency IN ('daily', 'weekly')),
  ADD COLUMN IF NOT EXISTS backup_on_report_completed boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS last_scheduled_backup_at timestamptz;

CREATE TABLE IF NOT EXISTS public.organization_backups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations (id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects (id) ON DELETE SET NULL,
  backup_type text NOT NULL CHECK (
    backup_type IN ('scheduled', 'report_completed', 'manual')
  ),
  storage_path text NOT NULL,
  filename text NOT NULL,
  byte_size bigint,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS organization_backups_org_idx
  ON public.organization_backups (organization_id, created_at DESC);

ALTER TABLE public.organization_backups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org admin read backups" ON public.organization_backups;
CREATE POLICY "org admin read backups"
  ON public.organization_backups FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id = organization_id AND o.admin_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "org admin update backup settings" ON public.organizations;
CREATE POLICY "org admin update backup settings"
  ON public.organizations FOR UPDATE TO authenticated
  USING (admin_user_id = auth.uid())
  WITH CHECK (admin_user_id = auth.uid());

GRANT SELECT ON public.organization_backups TO authenticated;
GRANT SELECT, UPDATE ON public.organizations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_backups TO service_role;

-- Storage: org admins read/download their org backup files
DROP POLICY IF EXISTS "org admin read backup files" ON storage.objects;
CREATE POLICY "org admin read backup files"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'org-backups'
    AND EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id = (split_part(name, '/', 1))::uuid
        AND o.admin_user_id = auth.uid()
    )
  );

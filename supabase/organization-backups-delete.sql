-- Allow org admins to delete backups from the app (Billing → Backups → Remove).
-- Run in Supabase SQL Editor if delete returns "permission denied for table organization_backups".

GRANT DELETE ON public.organization_backups TO authenticated;

DROP POLICY IF EXISTS "org admin delete backups" ON public.organization_backups;
CREATE POLICY "org admin delete backups"
  ON public.organization_backups FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id = organization_id AND o.admin_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "org admin delete backup files" ON storage.objects;
CREATE POLICY "org admin delete backup files"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'org-backups'
    AND EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id = (split_part(name, '/', 1))::uuid
        AND o.admin_user_id = auth.uid()
    )
  );

-- Run after roles-and-orgs.sql
-- Wrong signup fix + admin transfer support

DROP POLICY IF EXISTS "user delete own membership" ON public.organization_members;
CREATE POLICY "user delete own membership"
  ON public.organization_members FOR DELETE TO authenticated
  USING (user_id = auth.uid());

GRANT DELETE ON public.organization_members TO authenticated;

-- Org admin may update profiles of workers in their org (promote to admin)
DROP POLICY IF EXISTS "org admin update member profiles" ON public.profiles;
CREATE POLICY "org admin update member profiles"
  ON public.profiles FOR UPDATE TO authenticated
  USING (
    id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.organization_members m
      JOIN public.organizations o ON o.id = m.organization_id
      WHERE m.user_id = profiles.id AND o.admin_user_id = auth.uid()
    )
  );

-- Re-link projects when a user becomes their own org admin
DROP POLICY IF EXISTS "creator update own projects" ON public.projects;
CREATE POLICY "creator update own projects"
  ON public.projects FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

GRANT UPDATE ON public.projects TO authenticated;

-- Invite codes must match procedural format (8 chars, no ambiguous letters)
ALTER TABLE public.organizations
  DROP CONSTRAINT IF EXISTS organizations_invite_code_format;

ALTER TABLE public.organizations
  ADD CONSTRAINT organizations_invite_code_format
  CHECK (invite_code ~ '^[A-HJ-NP-Z2-9]{8}$');

-- Workers validate invite codes before signup (anon-safe lookup)
CREATE OR REPLACE FUNCTION public.lookup_org_by_invite(p_code text)
RETURNS TABLE (organization_id uuid, organization_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT o.id, o.name
  FROM public.organizations o
  WHERE o.invite_code = upper(regexp_replace(trim(p_code), '[^A-Za-z0-9]', '', 'g'))
    AND o.invite_code ~ '^[A-HJ-NP-Z2-9]{8}$';
$$;

GRANT EXECUTE ON FUNCTION public.lookup_org_by_invite(text) TO anon, authenticated;

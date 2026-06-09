-- Fix: infinite recursion detected in policy for relation "profiles"
-- when saving display name (Settings → Account).
--
-- Cause: UPDATE policies used subqueries on public.profiles inside WITH CHECK,
-- which re-triggered RLS on the same table.
--
-- Run once in Supabase → SQL Editor.

CREATE OR REPLACE FUNCTION public.current_user_profile_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.profile_role_for_user(uid uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = uid;
$$;

GRANT EXECUTE ON FUNCTION public.current_user_profile_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.profile_role_for_user(uuid) TO authenticated;

DROP POLICY IF EXISTS "users update own profile" ON public.profiles;
CREATE POLICY "users update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND role IS NOT DISTINCT FROM public.current_user_profile_role()
  );

DROP POLICY IF EXISTS "org admin update member profiles" ON public.profiles;
CREATE POLICY "org admin update member profiles"
  ON public.profiles FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members m
      JOIN public.organizations o ON o.id = m.organization_id
      WHERE m.user_id = profiles.id
        AND o.admin_user_id = auth.uid()
        AND m.status = 'approved'
    )
  )
  WITH CHECK (
    role IS NOT DISTINCT FROM public.profile_role_for_user(profiles.id)
    AND EXISTS (
      SELECT 1 FROM public.organization_members m
      JOIN public.organizations o ON o.id = m.organization_id
      WHERE m.user_id = profiles.id
        AND o.admin_user_id = auth.uid()
        AND m.status = 'approved'
    )
  );

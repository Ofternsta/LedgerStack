-- LedgerStack security hardening (run once in Supabase → SQL Editor)
-- Run AFTER: roles-and-orgs.sql, platform-security.sql, plan-usage.sql

-- ---------------------------------------------------------------------------
-- 1) Subscriptions: clients cannot upgrade themselves (Stripe/webhook only)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "org admin manage subscription" ON public.subscriptions;

DROP POLICY IF EXISTS "org admin read subscription" ON public.subscriptions;
CREATE POLICY "org admin read subscription"
  ON public.subscriptions FOR SELECT TO authenticated
  USING (public.is_org_admin(organization_id));

DROP POLICY IF EXISTS "org members read subscription" ON public.subscriptions;
CREATE POLICY "org members read subscription"
  ON public.subscriptions FOR SELECT TO authenticated
  USING (
    public.is_org_admin(organization_id)
    OR EXISTS (
      SELECT 1 FROM public.organization_members m
      WHERE m.organization_id = subscriptions.organization_id
        AND m.user_id = auth.uid()
        AND m.status = 'approved'
    )
  );

REVOKE INSERT, UPDATE, DELETE ON public.subscriptions FROM authenticated;
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;

-- ---------------------------------------------------------------------------
-- 2) Profiles: users cannot change their own role (prevents worker → admin hack)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "users update own profile" ON public.profiles;
CREATE POLICY "users update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- 3) Organizations: stop leaking every company's invite code
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "anyone read org by invite code" ON public.organizations;

-- Invite validation still works via lookup_org_by_invite() in account-role-fix.sql

-- ---------------------------------------------------------------------------
-- 4) Remove dangerous anon policies if they were applied during early setup
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "anon select projects" ON public.projects;
DROP POLICY IF EXISTS "anon insert projects" ON public.projects;
DROP POLICY IF EXISTS "anon delete projects" ON public.projects;
DROP POLICY IF EXISTS "anon select claims" ON public.claims;
DROP POLICY IF EXISTS "anon insert claims" ON public.claims;
DROP POLICY IF EXISTS "anon delete claims" ON public.claims;

REVOKE ALL ON TABLE public.projects FROM anon;
REVOKE ALL ON TABLE public.claims FROM anon;

-- Run once in Supabase Dashboard → SQL Editor
-- Fixes: "permission denied for table claims" on create, and Delete not working

-- Projects
GRANT SELECT, INSERT, DELETE ON TABLE public.projects TO anon;

DROP POLICY IF EXISTS "anon select projects" ON public.projects;
CREATE POLICY "anon select projects"
  ON public.projects FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "anon insert projects" ON public.projects;
CREATE POLICY "anon insert projects"
  ON public.projects FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "anon delete projects" ON public.projects;
CREATE POLICY "anon delete projects"
  ON public.projects FOR DELETE TO anon USING (true);

-- Claims (required when you tap Create Project)
GRANT SELECT, INSERT, DELETE ON TABLE public.claims TO anon;

DROP POLICY IF EXISTS "anon select claims" ON public.claims;
CREATE POLICY "anon select claims"
  ON public.claims FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "anon insert claims" ON public.claims;
CREATE POLICY "anon insert claims"
  ON public.claims FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "anon delete claims" ON public.claims;
CREATE POLICY "anon delete claims"
  ON public.claims FOR DELETE TO anon USING (true);

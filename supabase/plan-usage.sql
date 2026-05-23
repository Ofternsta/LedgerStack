-- Plan usage tracking (run in Supabase SQL Editor after platform-security.sql)

create table if not exists public.organization_ai_usage (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  month_key text not null,
  summaries_used int not null default 0 check (summaries_used >= 0),
  updated_at timestamptz not null default now(),
  primary key (organization_id, month_key)
);

create index if not exists organization_ai_usage_month_idx
  on public.organization_ai_usage (month_key);

alter table public.organization_ai_usage enable row level security;

grant select on public.organization_ai_usage to authenticated;
grant all on public.organization_ai_usage to service_role;

drop policy if exists "org members read ai usage" on public.organization_ai_usage;
create policy "org members read ai usage"
  on public.organization_ai_usage for select to authenticated
  using (
    public.is_org_admin(organization_id)
    or exists (
      select 1 from public.organization_members m
      where m.organization_id = organization_ai_usage.organization_id
        and m.user_id = auth.uid()
        and m.status = 'approved'
    )
  );

-- Org members can read subscription plan (for feature gating in the app)
drop policy if exists "org members read subscription" on public.subscriptions;
create policy "org members read subscription"
  on public.subscriptions for select to authenticated
  using (
    public.is_org_admin(organization_id)
    or exists (
      select 1 from public.organization_members m
      where m.organization_id = subscriptions.organization_id
        and m.user_id = auth.uid()
        and m.status = 'approved'
    )
  );

-- RLS hardening (phase 1)
-- NOTE: This enables RLS on key tables while preserving app behavior.
-- We avoid FORCE RLS in phase 1 to reduce break risk. Service role will continue to bypass RLS.

-- Company-scoped tables
alter table if exists public.companies enable row level security;
alter table if exists public.company enable row level security;
alter table if exists public.company_members enable row level security;
alter table if exists public.company_pricing enable row level security;
alter table if exists public.calls enable row level security;
alter table if exists public.retell_calls enable row level security;
alter table if exists public.invoices enable row level security;
alter table if exists public.revenue_transactions enable row level security;

-- User-scoped tables
alter table if exists public.user_profiles enable row level security;
alter table if exists public.user_preferences enable row level security;
alter table if exists public.user_credits enable row level security;
alter table if exists public.user_balances enable row level security;
alter table if exists public.user_agents enable row level security;
alter table if exists public.user_agent_assignments enable row level security;

-- Admin/system tables (restrict)
alter table if exists public.agents enable row level security;
alter table if exists public.retell_agents enable row level security;
alter table if exists public.webhook_logs enable row level security;
alter table if exists public.webhook_errors enable row level security;
alter table if exists public.request_log enable row level security;
alter table if exists public.rate_limits enable row level security;
alter table if exists public.transactions enable row level security;
alter table if exists public.super_admins enable row level security;

-- Baseline policies (idempotent-ish: create if not exists pattern using DO blocks)
-- Super admin bypass helper exists in schema: is_super_admin() returns boolean

-- Company members read their company
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='companies' AND policyname='company_members_read_company'
  ) THEN
    EXECUTE $$
      create policy "company_members_read_company"
      on public.companies for select to authenticated
      using (
        is_super_admin() OR
        exists(select 1 from public.company_members m
               where m.company_id = companies.id
                 and m.user_id = auth.uid()
                 and m.status = 'active')
      );
    $$;
  END IF;
END$$;

-- Super admin full access for common tables
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT unnest(ARRAY[
    'companies','company_members','company_pricing','calls','retell_calls','invoices','revenue_transactions',
    'user_profiles','user_preferences','user_credits','user_balances','user_agents','user_agent_assignments',
    'agents','retell_agents','webhook_logs','webhook_errors','request_log','rate_limits','transactions','super_admins'
  ]) as t LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename=r.t AND policyname='sa_full_access_all') THEN
      EXECUTE format($$
        create policy "sa_full_access_all" on public.%I for all
        using (is_super_admin()) with check (is_super_admin());
      $$, r.t);
    END IF;
  END LOOP;
END$$;

-- User self access (example for user_profiles; replicate as needed later)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_profiles' AND policyname='user_read_own_profile') THEN
    EXECUTE $$
      create policy "user_read_own_profile" on public.user_profiles for select to authenticated
      using (id = auth.uid() OR is_super_admin());
    $$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_profiles' AND policyname='user_update_own_profile') THEN
    EXECUTE $$
      create policy "user_update_own_profile" on public.user_profiles for update to authenticated
      using (id = auth.uid() OR is_super_admin())
      with check (id = auth.uid() OR is_super_admin());
    $$;
  END IF;
END$$;

-- Optional: read access for authenticated to agents (non-sensitive metadata)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='agents' AND policyname='auth_read_agents') THEN
    EXECUTE $$
      create policy "auth_read_agents" on public.agents for select to authenticated using (true);
    $$;
  END IF;
END$$;

-- Harden functions: set search_path = public for all public functions
DO $$
DECLARE rec record;
BEGIN
  FOR rec IN
    SELECT p.oid, n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) as args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' and p.prokind = 'f'
  LOOP
    EXECUTE format('alter function public.%I(%s) set search_path = public', rec.proname, rec.args);
  END LOOP;
END$$;

-- Lock down views that may expose auth data
REVOKE ALL ON VIEW public.users_low_balance FROM PUBLIC;
GRANT SELECT ON VIEW public.users_low_balance TO authenticated;

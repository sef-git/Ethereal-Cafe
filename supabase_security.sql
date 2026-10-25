-- Run in the Supabase SQL editor.
-- Table names follow the repo's current code (sessions, units, earnings, customers).
-- If you use the star schema (fact_sessions, dim_units, ...), swap the names.

-- 1) Turn on Row Level Security.
--    With RLS on and NO policy, the public anon key can read/write nothing.
--    The service-role key used by python_analytics.py bypasses RLS, so analytics keep working.
alter table public.sessions  enable row level security;
alter table public.units     enable row level security;
alter table public.earnings  enable row level security;
alter table public.customers enable row level security;

-- 2) Belt and braces: the anon role should not be able to write anywhere.
revoke insert, update, delete on public.sessions  from anon;
revoke insert, update, delete on public.units     from anon;
revoke insert, update, delete on public.earnings  from anon;
revoke insert, update, delete on public.customers from anon;

-- 3) OPTIONAL: only if your React frontend reads tables directly with the anon key.
--    Enabling RLS in step 1 will block those reads until you add read-only policies.
--    Expose only what the browser really needs. `customers` holds names, so keep it
--    private and let the server (Python analytics) serve customer data instead.
--
-- create policy "anon can read units"
--   on public.units    for select to anon using (true);
-- create policy "anon can read earnings"
--   on public.earnings for select to anon using (true);
-- create policy "anon can read sessions"
--   on public.sessions for select to anon using (true);

-- 4) Indexes that help the analytics queries and any date filtering.
create index if not exists idx_sessions_start       on public.sessions (session_start);
create index if not exists idx_sessions_pc_id       on public.sessions (pc_id);
create index if not exists idx_sessions_customer_id on public.sessions (customer_id);
create index if not exists idx_earnings_date        on public.earnings (date);

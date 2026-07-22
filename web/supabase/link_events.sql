-- Link-in-bio analytics for the /links page. Run once in the Supabase SQL
-- editor. Records one row per page view and per button click. Row Level
-- Security lets anyone (anonymous visitors) INSERT an event, but only
-- signed-in team members can SELECT and read the stats on /links/insights.

-- 1. Event table ------------------------------------------------------------
create table if not exists public.link_events (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  type       text not null check (type in ('view', 'click')),
  link       text                                    -- button label; null for views
);

create index if not exists link_events_created_at_idx on public.link_events (created_at);

alter table public.link_events enable row level security;

-- 2. Policies ---------------------------------------------------------------
-- Public visitors may record an event, but only insert (never read).
drop policy if exists "anyone can record an event" on public.link_events;
create policy "anyone can record an event" on public.link_events
  for insert to anon, authenticated with check (true);

-- Only signed-in users may read the aggregated stats.
drop policy if exists "authenticated can read events" on public.link_events;
create policy "authenticated can read events" on public.link_events
  for select to authenticated using (true);

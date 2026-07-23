-- Exhibition guest book. Visitors sign at the booth on /guestbook; the entries
-- are read only by signed-in team members on /guestbook/admin. Run once in the
-- Supabase SQL editor. RLS lets anyone (anonymous booth visitors) INSERT an
-- entry, but only authenticated users may SELECT and read them.

-- 1. Entries table ----------------------------------------------------------
create table if not exists public.guestbook_entries (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  name        text not null,
  institution text,
  role        text,
  email       text,
  whatsapp    text
);

create index if not exists guestbook_entries_created_at_idx on public.guestbook_entries (created_at);

alter table public.guestbook_entries enable row level security;

-- 2. Policies ---------------------------------------------------------------
-- Booth visitors may sign the guest book, but only insert (never read).
drop policy if exists "anyone can sign the guest book" on public.guestbook_entries;
create policy "anyone can sign the guest book" on public.guestbook_entries
  for insert to anon, authenticated with check (true);

-- Only signed-in team members may read the collected entries.
drop policy if exists "authenticated can read guestbook" on public.guestbook_entries;
create policy "authenticated can read guestbook" on public.guestbook_entries
  for select to authenticated using (true);

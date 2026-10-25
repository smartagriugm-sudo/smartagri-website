-- Lab accounts: onboarding fields, approval status and admins on top of
-- profiles.sql, plus RLS that lets only approved (active) members use the
-- internal tools. Design: docs/auth/design.md. Run once in the Supabase SQL
-- editor after profiles.sql (and after inventory.sql, guestbook.sql,
-- link_events.sql, rag.sql and kanban.sql where those are installed; tables
-- that do not exist are skipped). Safe to run again.
--
-- After the first run, make yourself the first admin (SQL editor only):
--   update public.profiles set is_admin = true
--   where id = (select id from auth.users where lower(email) = lower('you@ugm.ac.id'));

-- 1. Columns -------------------------------------------------------------------
-- status is added with default 'active' so every existing account keeps
-- working, then the default becomes 'pending' for new sign-ups. Running the
-- file again does not touch status.
do $$
begin
  if not exists (select 1 from information_schema.columns
                  where table_schema = 'public' and table_name = 'profiles' and column_name = 'status') then
    alter table public.profiles add column status text not null default 'active';
    alter table public.profiles alter column status set default 'pending';
  end if;
end;
$$;

alter table public.profiles drop constraint if exists profiles_status_check;
alter table public.profiles add constraint profiles_status_check
  check (status in ('pending', 'active', 'suspended', 'rejected'));

alter table public.profiles add column if not exists is_admin       boolean not null default false;
alter table public.profiles add column if not exists lab_role       text not null default '';
alter table public.profiles add column if not exists cohort         integer;
alter table public.profiles add column if not exists research_topic text not null default '';
alter table public.profiles add column if not exists supervisor_id  uuid references public.profiles (id) on delete set null;
alter table public.profiles add column if not exists onboarded_at   timestamptz;
alter table public.profiles add column if not exists approved_at    timestamptz;
alter table public.profiles add column if not exists approved_by    uuid references auth.users (id) on delete set null;
-- staff_id (from profiles.sql) holds the NIM or NIP. It stays private: only
-- the owner and admins see it; lab_directory() leaves it out.

alter table public.profiles drop constraint if exists profiles_lab_role_check;
alter table public.profiles add constraint profiles_lab_role_check
  check (lab_role in ('', 'dosen', 'peneliti', 'staf', 's3', 's2', 's1', 'alumni', 'mitra'));

-- 2. Who is who ----------------------------------------------------------------
create or replace function public.is_lab_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and status = 'active');
$$;

create or replace function public.is_lab_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and status = 'active' and is_admin);
$$;

-- 3. Guard: people edit their own profile, but only admins (through the RPCs
-- below) or the SQL editor (no auth.uid()) change status, admin and approval.
create or replace function public.profiles_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or public.is_lab_admin() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.status := 'pending';
    new.is_admin := false;
    new.approved_at := null;
    new.approved_by := null;
  else
    new.status := old.status;
    new.is_admin := old.is_admin;
    new.approved_at := old.approved_at;
    new.approved_by := old.approved_by;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard on public.profiles;
create trigger profiles_guard before insert or update on public.profiles
  for each row execute function public.profiles_guard();

-- New sign-ups: the name typed on /sign-up arrives as user metadata.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(trim(new.raw_user_meta_data ->> 'full_name'), ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

-- 4. Lookups -------------------------------------------------------------------
-- Supervisors to pick from during onboarding (pending accounts need it too).
create or replace function public.lab_supervisors()
returns table (id uuid, full_name text, lab_role text)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.full_name, p.lab_role
    from public.profiles p
   where auth.uid() is not null
     and p.status = 'active'
     and p.lab_role in ('dosen', 'peneliti')
     and length(trim(p.full_name)) > 0
   order by p.full_name;
$$;

-- Active members for pickers and member lists. No email, no NIM.
create or replace function public.lab_directory()
returns table (id uuid, full_name text, preferred_name text, lab_role text, cohort integer,
               research_topic text, supervisor_id uuid, avatar_url text)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.full_name, p.preferred_name, p.lab_role, p.cohort, p.research_topic, p.supervisor_id, p.avatar_url
    from public.profiles p
   where public.is_lab_member() and p.status = 'active'
   order by p.full_name;
$$;

-- 5. Admin RPCs ------------------------------------------------------------------
-- Every account with its email and sign-in dates, for the Members page.
create or replace function public.lab_accounts()
returns table (id uuid, email text, full_name text, preferred_name text, lab_role text, cohort integer,
               staff_id text, research_topic text, supervisor_id uuid, avatar_url text, status text,
               is_admin boolean, onboarded_at timestamptz, approved_at timestamptz,
               created_at timestamptz, last_sign_in_at timestamptz)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_lab_admin() then
    raise exception 'Only a lab admin can list accounts';
  end if;
  return query
    select p.id, u.email::text, p.full_name, p.preferred_name, p.lab_role, p.cohort, p.staff_id,
           p.research_topic, p.supervisor_id, p.avatar_url, p.status, p.is_admin, p.onboarded_at,
           p.approved_at, u.created_at, u.last_sign_in_at
      from public.profiles p
      join auth.users u on u.id = p.id
     order by (p.status = 'pending') desc, u.created_at desc;
end;
$$;

-- Approve, reject, suspend or reactivate; when activating, optionally join
-- Kanban boards as a member.
create or replace function public.lab_review_account(target uuid, new_status text, board_ids uuid[] default '{}')
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_lab_admin() then
    raise exception 'Only a lab admin can review accounts';
  end if;
  if new_status not in ('pending', 'active', 'suspended', 'rejected') then
    raise exception 'Unknown status %', new_status;
  end if;
  if target = auth.uid() and new_status <> 'active' then
    raise exception 'You cannot deactivate your own account';
  end if;
  update public.profiles
     set status = new_status,
         approved_at = case when new_status = 'active' then coalesce(approved_at, now()) else approved_at end,
         approved_by = case when new_status = 'active' then coalesce(approved_by, auth.uid()) else approved_by end,
         updated_at = now()
   where id = target;
  if not found then
    raise exception 'No such account';
  end if;
  if new_status = 'active' and coalesce(array_length(board_ids, 1), 0) > 0
     and to_regclass('public.kanban_board_members') is not null then
    execute 'insert into public.kanban_board_members (board_id, user_id, role)
             select b, $1, ''member'' from unnest($2) as b
              where exists (select 1 from public.kanban_boards x where x.id = b)
             on conflict (board_id, user_id) do nothing'
      using target, board_ids;
  end if;
end;
$$;

create or replace function public.lab_set_admin(target uuid, flag boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_lab_admin() then
    raise exception 'Only a lab admin can change admins';
  end if;
  if not flag and target = auth.uid() then
    raise exception 'Ask another admin to remove your admin role';
  end if;
  update public.profiles set is_admin = flag, updated_at = now() where id = target and status = 'active';
  if not found then
    raise exception 'Only active accounts can be admins';
  end if;
end;
$$;

revoke execute on function public.lab_accounts() from anon;
revoke execute on function public.lab_review_account(uuid, text, uuid[]) from anon;
revoke execute on function public.lab_set_admin(uuid, boolean) from anon;

-- 6. Internal tools: active members only -------------------------------------------
-- Same policy names as the original files, so re-running those files and then
-- this one leaves the stricter version in place. Public inserts (guest book,
-- link clicks) stay open.
do $$
begin
  if to_regclass('public.instruments') is not null then
    drop policy if exists "authenticated read instruments" on public.instruments;
    create policy "authenticated read instruments" on public.instruments
      for select to authenticated using (public.is_lab_member());
    drop policy if exists "authenticated write instruments" on public.instruments;
    create policy "authenticated write instruments" on public.instruments
      for all to authenticated using (public.is_lab_member()) with check (public.is_lab_member());
  end if;
  if to_regclass('public.usage_logs') is not null then
    drop policy if exists "authenticated read logs" on public.usage_logs;
    create policy "authenticated read logs" on public.usage_logs
      for select to authenticated using (public.is_lab_member());
    drop policy if exists "authenticated write logs" on public.usage_logs;
    create policy "authenticated write logs" on public.usage_logs
      for all to authenticated using (public.is_lab_member()) with check (public.is_lab_member());
  end if;
  if to_regclass('public.guestbook_entries') is not null then
    drop policy if exists "authenticated can read guestbook" on public.guestbook_entries;
    create policy "authenticated can read guestbook" on public.guestbook_entries
      for select to authenticated using (public.is_lab_member());
  end if;
  if to_regclass('public.link_events') is not null then
    drop policy if exists "authenticated can read events" on public.link_events;
    create policy "authenticated can read events" on public.link_events
      for select to authenticated using (public.is_lab_member());
  end if;
  if to_regclass('public.doc_chunks') is not null then
    drop policy if exists "insert chunks" on public.doc_chunks;
    create policy "insert chunks" on public.doc_chunks
      for insert to authenticated with check (public.is_lab_member());
    drop policy if exists "delete chunks" on public.doc_chunks;
    create policy "delete chunks" on public.doc_chunks
      for delete to authenticated using (public.is_lab_member());
  end if;
end;
$$;

-- Kanban: a role on any board (including Team boards) needs an active account,
-- and only active members create boards. Every Kanban policy and the storage
-- policies go through kanban_role(), so this one function covers them.
do $$
begin
  if to_regclass('public.kanban_boards') is not null then
    execute $f$
      create or replace function public.kanban_role(b uuid)
      returns text
      language sql
      stable
      security definer
      set search_path = public
      as $body$
        select case when public.is_lab_member() then coalesce(
          (select m.role from public.kanban_board_members m
            where m.board_id = b and m.user_id = auth.uid()),
          (select 'viewer' from public.kanban_boards x
            where x.id = b and x.visibility = 'team' and auth.uid() is not null)
        ) end;
      $body$
    $f$;
    drop policy if exists "kanban boards create" on public.kanban_boards;
    create policy "kanban boards create" on public.kanban_boards
      for insert to authenticated with check (created_by = auth.uid() and public.is_lab_member());
  end if;
end;
$$;

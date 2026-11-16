-- Field sites: data pushed from an on-site edge PC (the SGH greenhouse dashboard at
-- Grabag and any later site) so lab members and partners can read it on
-- /indoor-farming/dashboard/field. Contract for the edge PC:
-- docs/indoor-farming/API-EDGE-SYNC.md. Run manually in the Supabase SQL editor
-- after accounts.sql. Safe to run again.
--
-- Who reads what (enforced here, not only in the page):
--   - lab admins: every site
--   - active lab members whose lab_role is not 'mitra': every site
--   - active partners (lab_role 'mitra'): only the sites they were added to
--   - pending, suspended or rejected accounts and visitors: nothing
-- The edge PC writes with its own site token through edge_ingest(). Only a hash
-- of the token is stored, in a table no user can read.

-- 1. Tables --------------------------------------------------------------------

create table if not exists public.edge_site (
  id           uuid primary key default gen_random_uuid(),
  code         text not null unique check (code ~ '^[a-z0-9][a-z0-9-]{1,39}$'),
  name         text not null,
  location     text not null default '',
  -- Expected push interval of the edge PC (it sends closed 10-minute averages once per
  -- window). A site counts as offline after 3 intervals.
  interval_s   integer not null default 600 check (interval_s between 10 and 3600),
  last_seen_at timestamptz,
  created_at   timestamptz not null default now()
);

create table if not exists public.edge_site_token (
  site_id    uuid primary key references public.edge_site (id) on delete cascade,
  token_hash text not null unique,
  issued_at  timestamptz not null default now(),
  issued_by  uuid
);

create table if not exists public.edge_site_member (
  site_id  uuid not null references public.edge_site (id) on delete cascade,
  user_id  uuid not null references auth.users (id) on delete cascade,
  added_at timestamptz not null default now(),
  added_by uuid,
  primary key (site_id, user_id)
);
create index if not exists edge_site_member_user_idx on public.edge_site_member (user_id);

-- One row per instrument on the edge PC (Engrow, Nutrigrow, AWS). source_id is the
-- edge PC's own id for it (for example "dev-3"); its apikey never leaves the site.
create table if not exists public.edge_device (
  id           uuid primary key default gen_random_uuid(),
  site_id      uuid not null references public.edge_site (id) on delete cascade,
  source_id    text not null,
  name         text not null default '',
  kind         text not null default 'other',
  zone         text not null default '',
  metrics      text[] not null default '{}',
  last_seen_at timestamptz,
  updated_at   timestamptz not null default now(),
  unique (site_id, source_id)
);

create table if not exists public.edge_reading (
  device_id uuid not null references public.edge_device (id) on delete cascade,
  site_id   uuid not null references public.edge_site (id) on delete cascade,
  metric    text not null,
  ts        timestamptz not null,
  value     double precision not null,
  primary key (device_id, metric, ts)
);
create index if not exists edge_reading_ts_brin on public.edge_reading using brin (ts);
create index if not exists edge_reading_site_idx on public.edge_reading (site_id, ts desc);

create table if not exists public.edge_latest (
  device_id uuid not null references public.edge_device (id) on delete cascade,
  site_id   uuid not null references public.edge_site (id) on delete cascade,
  metric    text not null,
  ts        timestamptz not null,
  value     double precision not null,
  primary key (device_id, metric)
);

-- Relays and their state as the edge PC last saw them. Read only: nothing on the
-- website sends a command back to the site.
create table if not exists public.edge_actuator (
  id         uuid primary key default gen_random_uuid(),
  site_id    uuid not null references public.edge_site (id) on delete cascade,
  source_id  text not null,
  name       text not null default '',
  kind       text not null default '',
  zone       text not null default '',
  is_on      boolean,
  mode       text not null default 'auto',
  online     boolean,
  changed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (site_id, source_id)
);

-- 2. Who may read a site ---------------------------------------------------------

-- The sites the signed-in account may read. Set-returning so a policy evaluates it
-- once per query rather than once per row.
create or replace function public.edge_readable_sites()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select s.id
    from public.edge_site s
   where exists (
           select 1 from public.profiles p
            where p.id = auth.uid() and p.status = 'active'
              and (p.is_admin or coalesce(p.lab_role, '') <> 'mitra')
         )
      or exists (
           select 1 from public.edge_site_member m
             join public.profiles p on p.id = m.user_id
            where m.site_id = s.id and m.user_id = auth.uid() and p.status = 'active'
         );
$$;

-- lab_role is otherwise the user's own to edit (onboarding). An approved partner must
-- not lift themself out of 'mitra' and so read every site: only an admin (or the SQL
-- editor) may change that role once the account is active.
create or replace function public.edge_partner_role_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_lab_admin()
     and old.status = 'active' and old.lab_role = 'mitra'
     and new.lab_role is distinct from old.lab_role then
    raise exception 'Ask a lab admin to change the role of a partner account.' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists edge_partner_role_guard on public.profiles;
create trigger edge_partner_role_guard before update on public.profiles
  for each row execute function public.edge_partner_role_guard();

alter table public.edge_site        enable row level security;
alter table public.edge_site_token  enable row level security;
alter table public.edge_site_member enable row level security;
alter table public.edge_device      enable row level security;
alter table public.edge_reading     enable row level security;
alter table public.edge_latest      enable row level security;
alter table public.edge_actuator    enable row level security;

drop policy if exists "edge read" on public.edge_site;
create policy "edge read" on public.edge_site for select to authenticated
  using (id in (select public.edge_readable_sites()));

drop policy if exists "edge read" on public.edge_device;
create policy "edge read" on public.edge_device for select to authenticated
  using (site_id in (select public.edge_readable_sites()));

drop policy if exists "edge read" on public.edge_reading;
create policy "edge read" on public.edge_reading for select to authenticated
  using (site_id in (select public.edge_readable_sites()));

drop policy if exists "edge read" on public.edge_latest;
create policy "edge read" on public.edge_latest for select to authenticated
  using (site_id in (select public.edge_readable_sites()));

drop policy if exists "edge read" on public.edge_actuator;
create policy "edge read" on public.edge_actuator for select to authenticated
  using (site_id in (select public.edge_readable_sites()));

-- Members see their own memberships; admins manage them through the RPCs below.
drop policy if exists "own membership" on public.edge_site_member;
create policy "own membership" on public.edge_site_member for select to authenticated
  using (user_id = auth.uid() or public.is_lab_admin());

-- edge_site_token has no policy at all: nobody reads it through the API.

-- 3. Ingest (called by POST /api/edge/ingest with the anon key) -------------------

create or replace function public.edge_ingest(token text, payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  site public.edge_site;
  item jsonb;
  dev_id uuid;
  metric_key text;
  val double precision;
  at_ts timestamptz;
  accepted integer := 0;
  rejected integer := 0;
  devices integer := 0;
  actuators integer := 0;
  errors text[] := '{}';
  why text;
begin
  select s.* into site
    from public.edge_site_token t
    join public.edge_site s on s.id = t.site_id
   where t.token_hash = encode(sha256(convert_to(coalesce(token, ''), 'UTF8')), 'hex');
  if not found then
    raise exception 'Site token not recognised' using errcode = '28000';
  end if;
  if jsonb_typeof(payload) is distinct from 'object' then
    raise exception 'payload must be an object';
  end if;
  if jsonb_array_length(coalesce(payload -> 'readings', '[]')) > 2000 then
    raise exception 'At most 2000 readings per send';
  end if;
  if jsonb_array_length(coalesce(payload -> 'devices', '[]')) > 200
     or jsonb_array_length(coalesce(payload -> 'actuators', '[]')) > 200 then
    raise exception 'At most 200 devices and 200 actuators per send';
  end if;

  -- Devices first, so readings in the same send can refer to them.
  for item in select * from jsonb_array_elements(coalesce(payload -> 'devices', '[]')) loop
    if coalesce(item ->> 'source_id', '') !~ '^[A-Za-z0-9_.:-]{1,64}$' then
      continue;
    end if;
    insert into public.edge_device as d (site_id, source_id, name, kind, zone, metrics, updated_at)
    values (
      site.id, item ->> 'source_id',
      left(coalesce(item ->> 'name', ''), 120),
      left(coalesce(item ->> 'kind', 'other'), 32),
      left(coalesce(item ->> 'zone', ''), 120),
      coalesce(array(select left(x, 32) from jsonb_array_elements_text(
        case when jsonb_typeof(item -> 'metrics') = 'array' then item -> 'metrics' else '[]' end) x limit 32), '{}'),
      now()
    )
    on conflict (site_id, source_id) do update
      set name = excluded.name, kind = excluded.kind, zone = excluded.zone,
          metrics = excluded.metrics, updated_at = now();
    devices := devices + 1;
  end loop;

  for item in select * from jsonb_array_elements(coalesce(payload -> 'actuators', '[]')) loop
    if coalesce(item ->> 'source_id', '') !~ '^[A-Za-z0-9_.:-]{1,64}$' then
      continue;
    end if;
    insert into public.edge_actuator as a (site_id, source_id, name, kind, zone, is_on, mode, online, changed_at, updated_at)
    values (
      site.id, item ->> 'source_id',
      left(coalesce(item ->> 'name', ''), 120),
      left(coalesce(item ->> 'kind', ''), 32),
      left(coalesce(item ->> 'zone', ''), 120),
      case when jsonb_typeof(item -> 'on') = 'boolean' then (item ->> 'on')::boolean end,
      case when item ->> 'mode' in ('auto', 'manual', 'pause') then item ->> 'mode' else 'auto' end,
      case when jsonb_typeof(item -> 'online') = 'boolean' then (item ->> 'online')::boolean end,
      case when item ->> 'changed_at' is not null then (item ->> 'changed_at')::timestamptz end,
      now()
    )
    on conflict (site_id, source_id) do update
      set name = excluded.name, kind = excluded.kind, zone = excluded.zone, is_on = excluded.is_on,
          mode = excluded.mode, online = excluded.online, changed_at = excluded.changed_at, updated_at = now();
    actuators := actuators + 1;
  end loop;

  -- Actuators the edge PC no longer lists are removed, when it sends the full list.
  if coalesce((payload ->> 'actuators_complete')::boolean, false) then
    delete from public.edge_actuator a
     where a.site_id = site.id
       and not exists (select 1 from jsonb_array_elements(payload -> 'actuators') x where x ->> 'source_id' = a.source_id);
  end if;

  for item in select * from jsonb_array_elements(coalesce(payload -> 'readings', '[]')) loop
    why := null;
    begin
      metric_key := item ->> 'metric';
      val := (item ->> 'value')::double precision;
      at_ts := (item ->> 'ts')::timestamptz;
    exception when others then
      why := 'format';
    end;
    if why is null and (metric_key is null or val is null or at_ts is null or metric_key !~ '^[a-z][a-z0-9_]{0,31}$') then
      why := 'format';
    elsif why is null and (val = 'NaN'::double precision or abs(val) > 1e7) then
      why := 'value out of range';
    elsif why is null and at_ts > now() + interval '5 minutes' then
      why := 'time in the future';
    elsif why is null and at_ts < now() - interval '90 days' then
      why := 'time more than 90 days ago';
    end if;
    if why is null then
      select d.id into dev_id from public.edge_device d
       where d.site_id = site.id and d.source_id = item ->> 'device';
      if not found then
        why := 'unknown device ' || coalesce(item ->> 'device', '');
      end if;
    end if;
    if why is not null then
      rejected := rejected + 1;
      if cardinality(errors) < 5 then errors := errors || why; end if;
      continue;
    end if;

    -- A 10-minute average on the edge PC can still change while its window is open,
    -- so a resend replaces the value rather than being ignored.
    insert into public.edge_reading (device_id, site_id, metric, ts, value)
    values (dev_id, site.id, metric_key, at_ts, val)
    on conflict (device_id, metric, ts) do update set value = excluded.value;

    insert into public.edge_latest as l (device_id, site_id, metric, ts, value)
    values (dev_id, site.id, metric_key, at_ts, val)
    on conflict (device_id, metric) do update
      set ts = excluded.ts, value = excluded.value
      where l.ts <= excluded.ts;

    update public.edge_device set last_seen_at = greatest(coalesce(last_seen_at, at_ts), at_ts) where id = dev_id;
    accepted := accepted + 1;
  end loop;

  update public.edge_site set last_seen_at = now() where id = site.id;

  return jsonb_build_object('accepted', accepted, 'rejected', rejected, 'errors', to_jsonb(errors),
                            'devices', devices, 'actuators', actuators);
end;
$$;

-- 4. Reading for charts (runs as the caller, so the policies above apply) ---------

-- Averages one metric of one device into at most ~points buckets over [from_ts, to_ts].
create or replace function public.edge_series(device uuid, metric_key text, from_ts timestamptz, to_ts timestamptz, points integer default 300)
returns table (ts timestamptz, value double precision, min_value double precision, max_value double precision)
language sql
stable
set search_path = public
as $$
  with span as (
    select greatest(600, ceil(extract(epoch from (to_ts - from_ts)) / greatest(least(points, 1000), 10)))::integer as step_s
  )
  select to_timestamp(floor(extract(epoch from r.ts) / span.step_s) * span.step_s) as ts,
         avg(r.value), min(r.value), max(r.value)
    from public.edge_reading r, span
   where r.device_id = device and r.metric = metric_key and r.ts >= from_ts and r.ts <= to_ts
     and to_ts - from_ts <= interval '93 days'
   group by 1
   order by 1;
$$;

-- 5. Admin (lab admins only) -----------------------------------------------------

create or replace function public.edge_admin_save_site(site uuid, site_code text, site_name text, site_location text, push_interval integer)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  saved uuid;
begin
  if not public.is_lab_admin() then
    raise exception 'Only lab admins can manage field sites.' using errcode = '42501';
  end if;
  if site is null then
    insert into public.edge_site (code, name, location, interval_s)
    values (lower(trim(site_code)), trim(site_name), trim(coalesce(site_location, '')), coalesce(push_interval, 60))
    returning id into saved;
  else
    update public.edge_site
       set code = lower(trim(site_code)), name = trim(site_name), location = trim(coalesce(site_location, '')),
           interval_s = coalesce(push_interval, interval_s)
     where id = site
    returning id into saved;
    if saved is null then raise exception 'Site not found'; end if;
  end if;
  return saved;
end;
$$;

-- Hands the token out once. Issuing a new one cuts off the old one at once.
create or replace function public.edge_admin_issue_token(site uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  fresh text := 'edg_' || replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
begin
  if not public.is_lab_admin() then
    raise exception 'Only lab admins can manage field sites.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.edge_site s where s.id = site) then
    raise exception 'Site not found';
  end if;
  insert into public.edge_site_token as t (site_id, token_hash, issued_at, issued_by)
  values (site, encode(sha256(convert_to(fresh, 'UTF8')), 'hex'), now(), auth.uid())
  on conflict (site_id) do update set token_hash = excluded.token_hash, issued_at = excluded.issued_at, issued_by = excluded.issued_by;
  return fresh;
end;
$$;

create or replace function public.edge_admin_site_access(site uuid)
returns table (user_id uuid, email text, full_name text, lab_role text, status text, added_at timestamptz)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_lab_admin() then
    raise exception 'Only lab admins can manage field sites.' using errcode = '42501';
  end if;
  return query
    select m.user_id, u.email::text, coalesce(nullif(p.full_name, ''), p.preferred_name, ''), coalesce(p.lab_role, ''),
           coalesce(p.status, ''), m.added_at
      from public.edge_site_member m
      join auth.users u on u.id = m.user_id
      left join public.profiles p on p.id = m.user_id
     where m.site_id = site
     order by m.added_at;
end;
$$;

-- Gives an account access to a site by its email. The account must exist (the
-- partner signs up first); approving it stays in /account > Lab members.
create or replace function public.edge_admin_add_member(site uuid, member_email text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  member uuid;
begin
  if not public.is_lab_admin() then
    raise exception 'Only lab admins can manage field sites.' using errcode = '42501';
  end if;
  select u.id into member from auth.users u where lower(u.email) = lower(trim(member_email));
  if member is null then
    raise exception 'No account uses that email yet. Ask the partner to sign up first.';
  end if;
  insert into public.edge_site_member (site_id, user_id, added_by)
  values (site, member, auth.uid())
  on conflict (site_id, user_id) do nothing;
  return member;
end;
$$;

create or replace function public.edge_admin_remove_member(site uuid, member uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_lab_admin() then
    raise exception 'Only lab admins can manage field sites.' using errcode = '42501';
  end if;
  delete from public.edge_site_member where site_id = site and user_id = member;
end;
$$;

-- Drops readings older than keep_days (run by hand or from a scheduled job).
create or replace function public.edge_prune(keep_days integer default 400)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  removed integer;
begin
  if auth.uid() is not null and not public.is_lab_admin() then
    raise exception 'Only lab admins can prune readings.' using errcode = '42501';
  end if;
  delete from public.edge_reading where ts < now() - make_interval(days => greatest(keep_days, 30));
  get diagnostics removed = row_count;
  return removed;
end;
$$;

-- 6. Grants ----------------------------------------------------------------------

do $$
declare
  fn text;
begin
  revoke all on function public.edge_readable_sites() from public, anon;
  grant execute on function public.edge_readable_sites() to authenticated;
  foreach fn in array array[
    'edge_series(uuid, text, timestamptz, timestamptz, integer)',
    'edge_admin_save_site(uuid, text, text, text, integer)',
    'edge_admin_issue_token(uuid)',
    'edge_admin_site_access(uuid)',
    'edge_admin_add_member(uuid, text)',
    'edge_admin_remove_member(uuid, uuid)',
    'edge_prune(integer)'
  ] loop
    execute format('revoke all on function public.%s from public, anon', fn);
    execute format('grant execute on function public.%s to authenticated', fn);
  end loop;
  -- The edge PC has no login: its token is checked inside.
  revoke all on function public.edge_ingest(text, jsonb) from public;
  grant execute on function public.edge_ingest(text, jsonb) to anon, authenticated;
end;
$$;

revoke all on public.edge_site_token from anon, authenticated;
revoke insert, update, delete on public.edge_site, public.edge_site_member, public.edge_device,
  public.edge_reading, public.edge_latest, public.edge_actuator from anon, authenticated;

-- 7. First site (edit the name or location in the page later) ---------------------

insert into public.edge_site (code, name, location, interval_s)
values ('sgh-grabag', 'Smart Greenhouse Grabag', 'Grabag, Magelang', 600)
on conflict (code) do nothing;

-- Installs from before the 10-minute push: the old default was 60 s.
alter table public.edge_site alter column interval_s set default 600;
update public.edge_site set interval_s = 600 where interval_s = 60;

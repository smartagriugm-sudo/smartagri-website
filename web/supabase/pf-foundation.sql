-- ERP foundation: locations, crops, versioned recipes, ERP roles and the audit
-- log. Design: docs/erp-plant-factory/RENCANA-ERP-PLANT-FACTORY.md. Run manually
-- in the Supabase SQL editor after accounts.sql (it uses is_lab_member() and
-- is_lab_admin()). Safe to run again: existing rows are left alone.
--
-- Lab admins (profiles.is_admin) always count as ERP admins, so they can hand
-- out the first roles from /erp/pengaturan/peran. Nothing here needs a secret
-- key: every table is read and written with the signed-in user's token and RLS.

-- 1. Tables --------------------------------------------------------------------

-- One tree for every place: site, room, rack, tier, gully, hole, or site,
-- chamber, shelf, tray position. `code` is what links a row to the 3D model
-- (R1-T2-G3-H12, CH1-S2-P03). Tray counts are data here, never a constraint.
create table if not exists public.pf_location (
  id          uuid primary key default gen_random_uuid(),
  parent_id   uuid references public.pf_location (id) on delete restrict,
  level       text not null check (level in ('site', 'room', 'rack', 'tier', 'gully', 'hole', 'chamber', 'chamber_shelf', 'tray_position')),
  code        text not null unique,
  name        text not null default '',
  capacity    integer check (capacity is null or capacity >= 0),
  slot_status text check (slot_status in ('available', 'maintenance', 'retired')),
  attrs       jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  -- Only a place that can hold a plant or a tray has a status.
  constraint pf_location_slot_status check ((level in ('hole', 'tray_position')) = (slot_status is not null)),
  constraint pf_location_root check ((level = 'site') = (parent_id is null))
);
create index if not exists pf_location_parent_idx on public.pf_location (parent_id);

create table if not exists public.pf_crop (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (length(trim(name)) > 0),
  variety    text not null default '',
  cycle_days integer check (cycle_days is null or cycle_days > 0),
  germ_rate  numeric(5, 2) check (germ_rate is null or germ_rate between 0 and 100),
  notes      text not null default '',
  active     boolean not null default true,
  created_at timestamptz not null default now(),
  unique (name, variety)
);

-- A recipe is never edited in place once active: a change is a new version.
create table if not exists public.pf_recipe (
  id                uuid primary key default gen_random_uuid(),
  crop_id           uuid not null references public.pf_crop (id) on delete restrict,
  code              text not null check (code ~ '^[A-Z0-9][A-Z0-9-]*$'),
  version           integer not null default 1 check (version > 0),
  parent_version_id uuid references public.pf_recipe (id) on delete set null,
  status            text not null default 'draft' check (status in ('draft', 'active', 'retired')),
  notes             text not null default '',
  created_by        uuid default auth.uid() references auth.users (id) on delete set null,
  created_at        timestamptz not null default now(),
  activated_at      timestamptz,
  unique (code, version)
);
create unique index if not exists pf_recipe_one_active on public.pf_recipe (code) where status = 'active';
create unique index if not exists pf_recipe_one_draft on public.pf_recipe (code) where status = 'draft';
create index if not exists pf_recipe_crop_idx on public.pf_recipe (crop_id);

create table if not exists public.pf_recipe_phase (
  id            uuid primary key default gen_random_uuid(),
  recipe_id     uuid not null references public.pf_recipe (id) on delete cascade,
  phase         text not null check (phase in ('semai', 'germinasi', 'bibit', 'vegetatif', 'pra_panen')),
  seq           integer not null check (seq > 0),
  duration_days integer not null check (duration_days > 0),
  photoperiod_h numeric(4, 1) check (photoperiod_h is null or photoperiod_h between 0 and 24),
  ppfd_umol     numeric(7, 1) check (ppfd_umol is null or ppfd_umol >= 0),
  unique (recipe_id, seq)
);

create table if not exists public.pf_user_role (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  role       text not null check (role in ('pimpinan', 'admin', 'manajer_produksi', 'staf_penjualan', 'staf_sdm', 'teknisi', 'operator', 'peneliti')),
  granted_by uuid default auth.uid() references auth.users (id) on delete set null,
  granted_at timestamptz not null default now(),
  primary key (profile_id, role)
);

create table if not exists public.pf_audit_log (
  id         bigint generated always as identity primary key,
  at         timestamptz not null default now(),
  actor_id   uuid references auth.users (id) on delete set null,
  table_name text not null,
  row_id     text not null,
  action     text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  old_data   jsonb,
  new_data   jsonb
);
create index if not exists pf_audit_log_at_idx on public.pf_audit_log (at desc);
create index if not exists pf_audit_log_row_idx on public.pf_audit_log (table_name, row_id);

-- 2. Who may do what -----------------------------------------------------------
create or replace function public.pf_has_role(wanted text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_lab_member()
     and exists (select 1 from public.pf_user_role where profile_id = auth.uid() and role = any (wanted));
$$;

create or replace function public.pf_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_lab_admin() or public.pf_has_role(array['admin']);
$$;

create or replace function public.pf_can_manage_production()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.pf_is_admin() or public.pf_has_role(array['manajer_produksi']);
$$;

create or replace function public.pf_can_read_audit()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.pf_is_admin() or public.pf_has_role(array['pimpinan']);
$$;

-- 3. Guards --------------------------------------------------------------------
-- A location's code is the link to the 3D model and to every record that will
-- point at it, so it does not change. A place is retired, not deleted.
create or replace function public.pf_location_guard()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.code <> old.code or new.level <> old.level or new.parent_id is distinct from old.parent_id then
    raise exception 'A location''s code, level and parent cannot be changed';
  end if;
  return new;
end;
$$;

-- Only a draft can be edited or deleted. draft -> active needs at least one
-- phase; active -> retired is the only other move.
create or replace function public.pf_recipe_guard()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    if old.status <> 'draft' then
      raise exception 'Only a draft recipe can be deleted';
    end if;
    return old;
  end if;
  if tg_op = 'INSERT' then
    if new.status <> 'draft' then
      raise exception 'A new recipe must be a draft';
    end if;
    return new;
  end if;
  if old.status <> 'draft'
     and (to_jsonb(new) - 'status' - 'activated_at' is distinct from to_jsonb(old) - 'status' - 'activated_at') then
    raise exception 'An active recipe cannot be edited. Create a new version.';
  end if;
  if new.status <> old.status then
    if not ((old.status = 'draft' and new.status = 'active') or (old.status = 'active' and new.status = 'retired')) then
      raise exception 'Invalid recipe status change: % to %', old.status, new.status;
    end if;
    if new.status = 'active' and not exists (select 1 from public.pf_recipe_phase where recipe_id = new.id) then
      raise exception 'A recipe needs at least one phase before it can be activated';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.pf_recipe_phase_guard()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  recipe_status text;
begin
  if tg_op = 'UPDATE' and new.recipe_id <> old.recipe_id then
    raise exception 'A phase cannot move to another recipe';
  end if;
  select status into recipe_status from public.pf_recipe
   where id = case when tg_op = 'DELETE' then old.recipe_id else new.recipe_id end;
  -- Not found: the draft itself is being deleted and takes its phases with it.
  if found and recipe_status <> 'draft' then
    raise exception 'Phases can only be changed on a draft recipe. Create a new version.';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

-- Runs with its owner's rights so the log cannot be skipped or forged by the
-- caller, whose own token has no write access to pf_audit_log.
create or replace function public.pf_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  before_row jsonb := case when tg_op = 'INSERT' then null else to_jsonb(old) end;
  after_row  jsonb := case when tg_op = 'DELETE' then null else to_jsonb(new) end;
  written    jsonb := coalesce(after_row, before_row);
begin
  if tg_op = 'UPDATE' and before_row = after_row then
    return new;
  end if;
  insert into public.pf_audit_log (actor_id, table_name, row_id, action, old_data, new_data)
  values (
    auth.uid(),
    tg_table_name,
    coalesce(written ->> 'id', (written ->> 'profile_id') || ':' || (written ->> 'role')),
    tg_op,
    before_row,
    after_row
  );
  return null;
end;
$$;

-- 4. Moves that touch more than one row. Both run with the caller's rights, so
-- RLS still decides who may make them.
create or replace function public.pf_recipe_activate(recipe uuid)
returns void
language plpgsql
set search_path = public
as $$
declare
  recipe_code text;
begin
  select code into recipe_code from public.pf_recipe where id = recipe and status = 'draft';
  if not found then
    raise exception 'Draft recipe not found';
  end if;
  update public.pf_recipe set status = 'retired' where code = recipe_code and status = 'active';
  update public.pf_recipe set status = 'active', activated_at = now() where id = recipe;
  if not found then
    raise exception 'You do not have permission to activate this recipe';
  end if;
end;
$$;

create or replace function public.pf_recipe_new_version(recipe uuid)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  source public.pf_recipe;
  created uuid;
begin
  select * into source from public.pf_recipe where id = recipe;
  if not found then
    raise exception 'Recipe not found';
  end if;
  if exists (select 1 from public.pf_recipe where code = source.code and status = 'draft') then
    raise exception 'Recipe % still has a draft. Finish that draft first.', source.code;
  end if;
  insert into public.pf_recipe (crop_id, code, version, parent_version_id, notes)
  values (
    source.crop_id,
    source.code,
    (select max(version) + 1 from public.pf_recipe where code = source.code),
    source.id,
    source.notes
  )
  returning id into created;
  insert into public.pf_recipe_phase (recipe_id, phase, seq, duration_days, photoperiod_h, ppfd_umol)
  select created, phase, seq, duration_days, photoperiod_h, ppfd_umol
    from public.pf_recipe_phase where recipe_id = source.id;
  return created;
end;
$$;

-- 5. RLS -----------------------------------------------------------------------
alter table public.pf_location     enable row level security;
alter table public.pf_crop         enable row level security;
alter table public.pf_recipe       enable row level security;
alter table public.pf_recipe_phase enable row level security;
alter table public.pf_user_role    enable row level security;
alter table public.pf_audit_log    enable row level security;

-- pf_location: any member reads, ERP admins add and edit. No delete policy.
drop policy if exists "pf_location_read" on public.pf_location;
create policy "pf_location_read" on public.pf_location for select to authenticated
  using (public.is_lab_member());
drop policy if exists "pf_location_insert" on public.pf_location;
create policy "pf_location_insert" on public.pf_location for insert to authenticated
  with check (public.pf_is_admin());
drop policy if exists "pf_location_update" on public.pf_location;
create policy "pf_location_update" on public.pf_location for update to authenticated
  using (public.pf_is_admin()) with check (public.pf_is_admin());

-- pf_crop: a crop is deactivated, not deleted, since recipes point at it.
drop policy if exists "pf_crop_read" on public.pf_crop;
create policy "pf_crop_read" on public.pf_crop for select to authenticated
  using (public.is_lab_member());
drop policy if exists "pf_crop_insert" on public.pf_crop;
create policy "pf_crop_insert" on public.pf_crop for insert to authenticated
  with check (public.pf_can_manage_production());
drop policy if exists "pf_crop_update" on public.pf_crop;
create policy "pf_crop_update" on public.pf_crop for update to authenticated
  using (public.pf_can_manage_production()) with check (public.pf_can_manage_production());

drop policy if exists "pf_recipe_read" on public.pf_recipe;
create policy "pf_recipe_read" on public.pf_recipe for select to authenticated
  using (public.is_lab_member());
drop policy if exists "pf_recipe_insert" on public.pf_recipe;
create policy "pf_recipe_insert" on public.pf_recipe for insert to authenticated
  with check (public.pf_can_manage_production());
drop policy if exists "pf_recipe_update" on public.pf_recipe;
create policy "pf_recipe_update" on public.pf_recipe for update to authenticated
  using (public.pf_can_manage_production()) with check (public.pf_can_manage_production());
drop policy if exists "pf_recipe_delete" on public.pf_recipe;
create policy "pf_recipe_delete" on public.pf_recipe for delete to authenticated
  using (public.pf_can_manage_production());

drop policy if exists "pf_recipe_phase_read" on public.pf_recipe_phase;
create policy "pf_recipe_phase_read" on public.pf_recipe_phase for select to authenticated
  using (public.is_lab_member());
drop policy if exists "pf_recipe_phase_write" on public.pf_recipe_phase;
create policy "pf_recipe_phase_write" on public.pf_recipe_phase for all to authenticated
  using (public.pf_can_manage_production()) with check (public.pf_can_manage_production());

-- pf_user_role: people see their own roles, ERP admins and leadership see all,
-- and only ERP admins change them.
drop policy if exists "pf_user_role_read" on public.pf_user_role;
create policy "pf_user_role_read" on public.pf_user_role for select to authenticated
  using ((profile_id = auth.uid() and public.is_lab_member()) or public.pf_can_read_audit());
drop policy if exists "pf_user_role_insert" on public.pf_user_role;
create policy "pf_user_role_insert" on public.pf_user_role for insert to authenticated
  with check (public.pf_is_admin());
drop policy if exists "pf_user_role_delete" on public.pf_user_role;
create policy "pf_user_role_delete" on public.pf_user_role for delete to authenticated
  using (public.pf_is_admin());

-- pf_audit_log: read only, and only pf_audit() writes to it.
drop policy if exists "pf_audit_log_read" on public.pf_audit_log;
create policy "pf_audit_log_read" on public.pf_audit_log for select to authenticated
  using (public.pf_can_read_audit());
revoke insert, update, delete, truncate on public.pf_audit_log from anon, authenticated;

-- 6. Seed: every hole and tray position gets its code. Before the triggers on a
-- first run, so the setup rows do not fill the audit log. On later runs
-- nothing is inserted, and only these places are ever filled in.
insert into public.pf_location (level, code, name)
values ('site', 'SARC', 'Smart Agriculture Research Center')
on conflict (code) do nothing;

insert into public.pf_location (parent_id, level, code, name, capacity)
select s.id, 'room', 'PF01', 'Plant factory', 480 from public.pf_location s where s.code = 'SARC'
on conflict (code) do nothing;

insert into public.pf_location (parent_id, level, code, name, capacity)
select p.id, 'rack', 'R' || r, 'Rak ' || r, 240
  from public.pf_location p cross join generate_series(1, 2) r
 where p.code = 'PF01'
on conflict (code) do nothing;

insert into public.pf_location (parent_id, level, code, name, capacity)
select p.id, 'tier', p.code || '-T' || t, 'Tingkat ' || t, 80
  from public.pf_location p cross join generate_series(1, 3) t
 where p.code in ('R1', 'R2')
on conflict (code) do nothing;

insert into public.pf_location (parent_id, level, code, name, capacity)
select p.id, 'gully', p.code || '-G' || g, 'Talang ' || g, 20
  from public.pf_location p cross join generate_series(1, 4) g
 where p.code ~ '^R[12]-T[123]$'
on conflict (code) do nothing;

insert into public.pf_location (parent_id, level, code, name, capacity, slot_status)
select p.id, 'hole', p.code || '-H' || lpad(h::text, 2, '0'), 'Lubang ' || h, 1, 'available'
  from public.pf_location p cross join generate_series(1, 20) h
 where p.code ~ '^R[12]-T[123]-G[1234]$'
on conflict (code) do nothing;

insert into public.pf_location (parent_id, level, code, name, capacity)
select s.id, 'chamber', 'CH1', 'Growth chamber FAITHFUL FPG450', 22 from public.pf_location s where s.code = 'SARC'
on conflict (code) do nothing;

insert into public.pf_location (parent_id, level, code, name, capacity)
select p.id, 'chamber_shelf', 'CH1-S' || v.shelf, 'Rak ' || v.shelf, v.positions
  from public.pf_location p cross join (values (1, 6), (2, 6), (3, 6), (4, 4)) as v (shelf, positions)
 where p.code = 'CH1'
on conflict (code) do nothing;

insert into public.pf_location (parent_id, level, code, name, capacity, slot_status)
select p.id, 'tray_position', p.code || '-P' || lpad(n::text, 2, '0'), 'Posisi ' || n, 1, 'available'
  from public.pf_location p
  cross join lateral generate_series(1, case p.code when 'CH1-S4' then 4 else 6 end) n
 where p.code in ('CH1-S1', 'CH1-S2', 'CH1-S3', 'CH1-S4')
on conflict (code) do nothing;

-- 7. Triggers ------------------------------------------------------------------
drop trigger if exists pf_location_guard on public.pf_location;
create trigger pf_location_guard before update on public.pf_location
  for each row execute function public.pf_location_guard();

drop trigger if exists pf_recipe_guard on public.pf_recipe;
create trigger pf_recipe_guard before insert or update or delete on public.pf_recipe
  for each row execute function public.pf_recipe_guard();

drop trigger if exists pf_recipe_phase_guard on public.pf_recipe_phase;
create trigger pf_recipe_phase_guard before insert or update or delete on public.pf_recipe_phase
  for each row execute function public.pf_recipe_phase_guard();

do $$
declare
  audited text;
begin
  foreach audited in array array['pf_location', 'pf_crop', 'pf_recipe', 'pf_recipe_phase', 'pf_user_role'] loop
    execute format('drop trigger if exists pf_audit on public.%I', audited);
    execute format(
      'create trigger pf_audit after insert or update or delete on public.%I for each row execute function public.pf_audit()',
      audited
    );
  end loop;
end;
$$;

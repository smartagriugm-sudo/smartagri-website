-- ERP people: who works here, contracts, schedules, leave, attendance with location
-- and a photo, and hours per batch. Design: docs/erp-plant-factory/RENCANA-ERP-PLANT-FACTORY.md.
-- Run manually in the Supabase SQL editor after pf-batch.sql. Safe to run again.
-- Payroll is out of scope.
--
-- Location and photos are personal data, so this follows three rules. They are taken
-- only at the moment someone clocks in or out, never tracked. Nobody is asked for them
-- before agreeing to what is stored and why (pf_attendance_consent). Photos are kept for
-- 90 days (pf_photo_retention_days), then removed while the attendance record stays.
--
-- Who sees what: everyone sees their own. Staf SDM manages people, and with Pimpinan
-- reads contracts and photos. ERP admins manage basic data but not contracts or photos.
-- The production manager keeps the team's schedule and sees attendance, without photos.

-- 1. Roles ---------------------------------------------------------------------

create or replace function public.pf_can_manage_people()
returns boolean language sql stable security definer set search_path = public
as $$ select public.pf_is_admin() or public.pf_has_role(array['staf_sdm']); $$;

create or replace function public.pf_can_schedule()
returns boolean language sql stable security definer set search_path = public
as $$ select public.pf_can_manage_people() or public.pf_has_role(array['manajer_produksi']); $$;

create or replace function public.pf_can_read_people()
returns boolean language sql stable security definer set search_path = public
as $$ select public.pf_can_schedule() or public.pf_has_role(array['pimpinan']); $$;

-- Contracts and photos: deliberately not ERP admins.
create or replace function public.pf_can_read_private()
returns boolean language sql stable security definer set search_path = public
as $$ select public.pf_has_role(array['staf_sdm', 'pimpinan']); $$;

create or replace function public.pf_require(allowed boolean)
returns void language plpgsql immutable
as $$
begin
  if not coalesce(allowed, false) then
    raise exception 'Akun Anda tidak punya izin untuk tindakan ini.' using errcode = '42501';
  end if;
end;
$$;

-- 2. Tables --------------------------------------------------------------------

-- Everyone who works here, with or without a login.
create table if not exists public.pf_person (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid unique references public.profiles (id) on delete set null,
  full_name     text not null check (length(trim(full_name)) > 0),
  person_type   text not null default 'karyawan' check (person_type in ('karyawan', 'peneliti', 'mahasiswa', 'magang', 'harian')),
  supervisor_id uuid references public.pf_person (id) on delete set null,
  phone         text not null default '',
  joined_on     date,
  left_on       date,
  status        text not null default 'aktif' check (status in ('aktif', 'nonaktif')),
  created_at    timestamptz not null default now()
);

create or replace function public.pf_my_person_id()
returns uuid language sql stable security definer set search_path = public
as $$ select p.id from public.pf_person p where p.profile_id = auth.uid(); $$;

create table if not exists public.pf_contract (
  id         uuid primary key default gen_random_uuid(),
  person_id  uuid not null references public.pf_person (id) on delete restrict,
  type       text not null check (type in ('tetap', 'kontrak', 'magang', 'harian', 'lainnya')),
  position   text not null default '',
  start_date date not null,
  end_date   date,
  rate_idr   numeric(14, 2) check (rate_idr is null or rate_idr >= 0),
  rate_basis text not null default 'bulan' check (rate_basis in ('jam', 'hari', 'bulan')),
  notes      text not null default '',
  created_at timestamptz not null default now(),
  check (end_date is null or end_date >= start_date)
);
create index if not exists pf_contract_person_idx on public.pf_contract (person_id);

-- A place to clock in at. Coordinates are entered by hand; nothing is assumed.
create table if not exists public.pf_work_area (
  id       uuid primary key default gen_random_uuid(),
  name     text not null check (length(trim(name)) > 0),
  lat      numeric(9, 6) not null check (lat between -90 and 90),
  lng      numeric(9, 6) not null check (lng between -180 and 180),
  radius_m integer not null default 150 check (radius_m between 10 and 5000),
  active   boolean not null default true
);

create table if not exists public.pf_shift (
  id         uuid primary key default gen_random_uuid(),
  person_id  uuid not null references public.pf_person (id) on delete restrict,
  work_date  date not null,
  start_at   time not null,
  end_at     time not null,
  area_id    uuid references public.pf_work_area (id) on delete set null,
  notes      text not null default '',
  created_at timestamptz not null default now(),
  unique (person_id, work_date, start_at),
  check (end_at > start_at)
);
create index if not exists pf_shift_date_idx on public.pf_shift (work_date);

create table if not exists public.pf_leave (
  id          uuid primary key default gen_random_uuid(),
  person_id   uuid not null references public.pf_person (id) on delete restrict,
  type        text not null check (type in ('izin', 'sakit', 'cuti')),
  start_date  date not null,
  end_date    date not null,
  reason      text not null default '',
  status      text not null default 'diajukan' check (status in ('diajukan', 'disetujui', 'ditolak', 'batal')),
  decided_by  uuid references auth.users (id) on delete set null,
  decided_at  timestamptz,
  decide_note text not null default '',
  created_at  timestamptz not null default now(),
  check (end_date >= start_date)
);
create index if not exists pf_leave_person_idx on public.pf_leave (person_id);

create table if not exists public.pf_attendance_consent (
  person_id    uuid primary key references public.pf_person (id) on delete cascade,
  accepted_at  timestamptz not null default now(),
  withdrawn_at timestamptz
);

create table if not exists public.pf_attendance (
  id              uuid primary key default gen_random_uuid(),
  person_id       uuid not null references public.pf_person (id) on delete restrict,
  shift_id        uuid references public.pf_shift (id) on delete set null,
  clock_in        timestamptz not null,
  clock_out       timestamptz,
  in_lat          numeric(9, 6),
  in_lng          numeric(9, 6),
  in_accuracy_m   numeric(8, 1),
  in_photo_path   text,
  in_within_area  boolean,
  out_lat         numeric(9, 6),
  out_lng         numeric(9, 6),
  out_accuracy_m  numeric(8, 1),
  out_photo_path  text,
  out_within_area boolean,
  -- Left open from an earlier day: it no longer blocks a new clock-in, and waits for a correction.
  missed_out      boolean not null default false,
  source          text not null default 'ponsel' check (source in ('ponsel', 'manual')),
  note            text not null default '',
  photos_removed_at timestamptz,
  created_at      timestamptz not null default now(),
  check (clock_out is null or clock_out >= clock_in)
);
create index if not exists pf_attendance_person_idx on public.pf_attendance (person_id, clock_in desc);
create index if not exists pf_attendance_in_idx on public.pf_attendance (clock_in desc);
create unique index if not exists pf_attendance_one_open on public.pf_attendance (person_id) where clock_out is null and not missed_out;

create table if not exists public.pf_labor_log (
  id         uuid primary key default gen_random_uuid(),
  person_id  uuid not null references public.pf_person (id) on delete restrict,
  batch_id   uuid not null references public.pf_batch (id) on delete restrict,
  work_date  date not null,
  minutes    integer not null check (minutes between 1 and 960),
  activity   text not null default '',
  by_id      uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists pf_labor_batch_idx on public.pf_labor_log (batch_id);
create index if not exists pf_labor_person_idx on public.pf_labor_log (person_id, work_date desc);

-- 3. Row level security ---------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array['pf_person', 'pf_contract', 'pf_work_area', 'pf_shift', 'pf_leave', 'pf_attendance_consent', 'pf_attendance', 'pf_labor_log'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_read', t);
    execute format('revoke insert, update, delete, truncate on public.%I from public, anon, authenticated', t);
  end loop;
end;
$$;

create policy "pf_person_read" on public.pf_person for select to authenticated
  using (profile_id = auth.uid() or public.pf_can_read_people());
create policy "pf_contract_read" on public.pf_contract for select to authenticated
  using (person_id = public.pf_my_person_id() or public.pf_can_read_private());
create policy "pf_work_area_read" on public.pf_work_area for select to authenticated
  using (public.is_lab_member());
create policy "pf_shift_read" on public.pf_shift for select to authenticated
  using (person_id = public.pf_my_person_id() or public.pf_can_read_people());
create policy "pf_leave_read" on public.pf_leave for select to authenticated
  using (person_id = public.pf_my_person_id() or public.pf_can_read_people());
create policy "pf_attendance_consent_read" on public.pf_attendance_consent for select to authenticated
  using (person_id = public.pf_my_person_id() or public.pf_can_read_private());
create policy "pf_attendance_read" on public.pf_attendance for select to authenticated
  using (person_id = public.pf_my_person_id() or public.pf_can_read_people());
create policy "pf_labor_log_read" on public.pf_labor_log for select to authenticated
  using (person_id = public.pf_my_person_id() or public.pf_can_read_people());

-- 4. Photos: a private bucket, one folder per person ------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('pf-attendance', 'pf-attendance', false, 1048576, array['image/jpeg'])
on conflict (id) do update set public = false, file_size_limit = 1048576, allowed_mime_types = array['image/jpeg'];

drop policy if exists "pf_attendance_photo_insert" on storage.objects;
create policy "pf_attendance_photo_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'pf-attendance' and (storage.foldername(name))[1] = public.pf_my_person_id()::text);

drop policy if exists "pf_attendance_photo_read" on storage.objects;
create policy "pf_attendance_photo_read" on storage.objects for select to authenticated
  using (bucket_id = 'pf-attendance' and ((storage.foldername(name))[1] = public.pf_my_person_id()::text or public.pf_can_read_private()));

-- Only the retention sweep removes photos, and only Staf SDM runs it.
drop policy if exists "pf_attendance_photo_delete" on storage.objects;
create policy "pf_attendance_photo_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'pf-attendance' and public.pf_has_role(array['staf_sdm']));

-- 5. Views ----------------------------------------------------------------------

create or replace view public.pf_person_overview with (security_invoker = true) as
select
  p.id, p.profile_id, p.full_name, p.person_type, p.supervisor_id, p.phone, p.joined_on, p.left_on, p.status,
  s.full_name as supervisor_name,
  p.profile_id is not null as has_account
from public.pf_person p
left join public.pf_person s on s.id = p.supervisor_id;

create or replace view public.pf_shift_overview with (security_invoker = true) as
select
  s.id, s.person_id, s.work_date, s.start_at, s.end_at, s.area_id, s.notes,
  p.full_name, a.name as area_name
from public.pf_shift s
join public.pf_person p on p.id = s.person_id
left join public.pf_work_area a on a.id = s.area_id;

create or replace view public.pf_attendance_overview with (security_invoker = true) as
select
  a.id, a.person_id, a.shift_id, a.clock_in, a.clock_out, a.in_accuracy_m, a.in_within_area, a.out_within_area,
  a.in_photo_path, a.out_photo_path, a.missed_out, a.source, a.note, a.photos_removed_at,
  (a.clock_in at time zone 'Asia/Jakarta')::date as work_date,
  p.full_name,
  s.start_at, s.end_at
from public.pf_attendance a
join public.pf_person p on p.id = a.person_id
left join public.pf_shift s on s.id = a.shift_id;

create or replace view public.pf_leave_overview with (security_invoker = true) as
select l.id, l.person_id, l.type, l.start_date, l.end_date, l.reason, l.status, l.decide_note, l.created_at, p.full_name
from public.pf_leave l
join public.pf_person p on p.id = l.person_id;

create or replace view public.pf_labor_overview with (security_invoker = true) as
select l.id, l.person_id, l.batch_id, l.work_date, l.minutes, l.activity, l.created_at, p.full_name, b.code as batch_code
from public.pf_labor_log l
join public.pf_person p on p.id = l.person_id
join public.pf_batch b on b.id = l.batch_id;

revoke all on public.pf_person_overview, public.pf_shift_overview, public.pf_attendance_overview, public.pf_leave_overview, public.pf_labor_overview from anon;
grant select on public.pf_person_overview, public.pf_shift_overview, public.pf_attendance_overview, public.pf_leave_overview, public.pf_labor_overview to authenticated;

-- 6. People and contracts -------------------------------------------------------

create or replace function public.pf_person_save(target uuid, account uuid, new_name text, new_type text, supervisor uuid, new_phone text, joined date, left_day date, new_status text default 'aktif')
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  saved uuid;
begin
  perform public.pf_require(public.pf_can_manage_people());
  if coalesce(trim(new_name), '') = '' then
    raise exception 'Nama wajib diisi';
  end if;
  if target is not null and supervisor = target then
    raise exception 'Seseorang tidak bisa menjadi atasannya sendiri';
  end if;
  if joined is not null and left_day is not null and left_day < joined then
    raise exception 'Tanggal keluar sebelum tanggal masuk';
  end if;
  if account is not null and exists (select 1 from public.pf_person p where p.profile_id = account and p.id is distinct from target) then
    raise exception 'Akun itu sudah terhubung ke orang lain';
  end if;
  if target is null then
    insert into public.pf_person (profile_id, full_name, person_type, supervisor_id, phone, joined_on, left_on, status)
    values (account, trim(new_name), new_type, supervisor, trim(coalesce(new_phone, '')), joined, left_day, coalesce(new_status, 'aktif'))
    returning id into saved;
  else
    update public.pf_person p
       set profile_id = account, full_name = trim(new_name), person_type = new_type, supervisor_id = supervisor, phone = trim(coalesce(new_phone, '')),
           joined_on = joined, left_on = left_day, status = coalesce(new_status, 'aktif')
     where p.id = target
    returning p.id into saved;
    if saved is null then
      raise exception 'Orang tidak ditemukan';
    end if;
  end if;
  return saved;
end;
$$;

-- Contracts are written only by Staf SDM, who are the ones who may read them.
create or replace function public.pf_contract_save(target uuid, person uuid, new_type text, new_position text, starts date, ends date, rate numeric, basis text, new_notes text default '')
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  saved uuid;
begin
  perform public.pf_require(public.pf_has_role(array['staf_sdm']));
  if starts is null then
    raise exception 'Tanggal mulai wajib diisi';
  end if;
  if ends is not null and ends < starts then
    raise exception 'Tanggal selesai sebelum tanggal mulai';
  end if;
  if rate is not null and rate < 0 then
    raise exception 'Upah tidak boleh negatif';
  end if;
  if target is null then
    insert into public.pf_contract (person_id, type, position, start_date, end_date, rate_idr, rate_basis, notes)
    values (person, new_type, trim(coalesce(new_position, '')), starts, ends, rate, coalesce(basis, 'bulan'), trim(coalesce(new_notes, '')))
    returning id into saved;
  else
    update public.pf_contract c
       set type = new_type, position = trim(coalesce(new_position, '')), start_date = starts, end_date = ends, rate_idr = rate, rate_basis = coalesce(basis, 'bulan'), notes = trim(coalesce(new_notes, ''))
     where c.id = target
    returning c.id into saved;
    if saved is null then
      raise exception 'Kontrak tidak ditemukan';
    end if;
  end if;
  return saved;
end;
$$;

create or replace function public.pf_work_area_save(target uuid, new_name text, new_lat numeric, new_lng numeric, radius integer, is_active boolean default true)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  saved uuid;
begin
  perform public.pf_require(public.pf_can_manage_people());
  if target is null then
    insert into public.pf_work_area (name, lat, lng, radius_m, active) values (trim(new_name), new_lat, new_lng, radius, coalesce(is_active, true)) returning id into saved;
  else
    update public.pf_work_area a set name = trim(new_name), lat = new_lat, lng = new_lng, radius_m = radius, active = coalesce(is_active, true) where a.id = target returning a.id into saved;
    if saved is null then
      raise exception 'Lokasi kerja tidak ditemukan';
    end if;
  end if;
  return saved;
end;
$$;

-- 7. Schedules and leave --------------------------------------------------------

create or replace function public.pf_shift_add(person uuid, dates date[], starts time, ends time, area uuid default null, new_notes text default '')
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  added integer;
begin
  perform public.pf_require(public.pf_can_schedule());
  if coalesce(cardinality(dates), 0) = 0 then
    raise exception 'Pilih minimal satu tanggal';
  end if;
  if starts is null or ends is null or ends <= starts then
    raise exception 'Jam selesai harus setelah jam mulai';
  end if;
  if not exists (select 1 from public.pf_person p where p.id = person and p.status = 'aktif') then
    raise exception 'Orang tidak ditemukan atau nonaktif';
  end if;
  insert into public.pf_shift (person_id, work_date, start_at, end_at, area_id, notes)
  select person, d, starts, ends, area, trim(coalesce(new_notes, '')) from unnest(dates) d
  on conflict (person_id, work_date, start_at) do nothing;
  get diagnostics added = row_count;
  return added;
end;
$$;

create or replace function public.pf_shift_remove(shift uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  perform public.pf_require(public.pf_can_schedule());
  if exists (select 1 from public.pf_attendance a where a.shift_id = shift) then
    raise exception 'Jadwal ini sudah punya catatan absen';
  end if;
  delete from public.pf_shift s where s.id = shift;
  if not found then
    raise exception 'Jadwal tidak ditemukan';
  end if;
end;
$$;

-- For oneself, or for someone else by those who manage people.
create or replace function public.pf_leave_request(person uuid, new_type text, starts date, ends date, why text default '')
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  who uuid := coalesce(person, public.pf_my_person_id());
  saved uuid;
begin
  if who is null then
    raise exception 'Akun Anda belum terdaftar di data orang. Hubungi Staf SDM.';
  end if;
  perform public.pf_require(who = public.pf_my_person_id() or public.pf_can_manage_people());
  if starts is null or ends is null or ends < starts then
    raise exception 'Tanggal selesai sebelum tanggal mulai';
  end if;
  if exists (select 1 from public.pf_leave l where l.person_id = who and l.status in ('diajukan', 'disetujui') and l.start_date <= ends and l.end_date >= starts) then
    raise exception 'Sudah ada pengajuan pada tanggal itu';
  end if;
  insert into public.pf_leave (person_id, type, start_date, end_date, reason) values (who, new_type, starts, ends, trim(coalesce(why, ''))) returning id into saved;
  return saved;
end;
$$;

create or replace function public.pf_leave_decide(leave uuid, approve boolean, note text default '')
returns void
language plpgsql security definer set search_path = public
as $$
declare
  the_row public.pf_leave;
begin
  perform public.pf_require(public.pf_can_schedule());
  select * into the_row from public.pf_leave l where l.id = leave for update;
  if not found or the_row.status <> 'diajukan' then
    raise exception 'Pengajuan tidak ditemukan atau sudah diputuskan';
  end if;
  if the_row.person_id = public.pf_my_person_id() then
    raise exception 'Pengajuan sendiri diputuskan oleh orang lain';
  end if;
  if not approve and coalesce(trim(note), '') = '' then
    raise exception 'Tulis alasan penolakan';
  end if;
  update public.pf_leave l set status = case when approve then 'disetujui' else 'ditolak' end, decided_by = auth.uid(), decided_at = now(), decide_note = trim(coalesce(note, '')) where l.id = leave;
end;
$$;

create or replace function public.pf_leave_cancel(leave uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  update public.pf_leave l set status = 'batal'
   where l.id = leave and l.status = 'diajukan' and (l.person_id = public.pf_my_person_id() or public.pf_can_manage_people());
  if not found then
    raise exception 'Pengajuan tidak bisa dibatalkan';
  end if;
end;
$$;

-- 8. Attendance -----------------------------------------------------------------

create or replace function public.pf_distance_m(lat1 numeric, lng1 numeric, lat2 numeric, lng2 numeric)
returns numeric
language sql immutable
as $$
  select 2 * 6371000 * asin(sqrt(
    power(sin(radians((lat2 - lat1)::double precision) / 2), 2) +
    cos(radians(lat1::double precision)) * cos(radians(lat2::double precision)) * power(sin(radians((lng2 - lng1)::double precision) / 2), 2)
  ))::numeric;
$$;

-- Null when it cannot be told: no location given, or no area to compare with.
-- A coarse fix is given the benefit of its accuracy, up to 100 m, so an indoor reading is not flagged for being indoors.
create or replace function public.pf_within_area(area uuid, at_lat numeric, at_lng numeric, accuracy numeric)
returns boolean
language plpgsql stable security definer set search_path = public
as $$
declare
  places integer := 0;
  hit boolean := false;
  place record;
begin
  if at_lat is null or at_lng is null then
    return null;
  end if;
  for place in select a.lat, a.lng, a.radius_m from public.pf_work_area a where a.active and (area is null or a.id = area) loop
    places := places + 1;
    if public.pf_distance_m(at_lat, at_lng, place.lat, place.lng) <= place.radius_m + least(coalesce(accuracy, 0), 100) then
      hit := true;
    end if;
  end loop;
  return case when places = 0 then null else hit end;
end;
$$;

create or replace function public.pf_consent_accept()
returns void
language plpgsql security definer set search_path = public
as $$
declare
  me uuid := public.pf_my_person_id();
begin
  if me is null then
    raise exception 'Akun Anda belum terdaftar di data orang. Hubungi Staf SDM.';
  end if;
  insert into public.pf_attendance_consent as c (person_id, accepted_at, withdrawn_at) values (me, now(), null)
  on conflict (person_id) do update set accepted_at = now(), withdrawn_at = null;
end;
$$;

create or replace function public.pf_consent_withdraw()
returns void
language plpgsql security definer set search_path = public
as $$
begin
  update public.pf_attendance_consent c set withdrawn_at = now() where c.person_id = public.pf_my_person_id();
end;
$$;

create or replace function public.pf_check_photo(me uuid, path text)
returns void
language plpgsql immutable
as $$
begin
  if coalesce(path, '') = '' then
    raise exception 'Foto absen wajib ada';
  end if;
  if split_part(path, '/', 1) <> me::text then
    raise exception 'Foto bukan milik akun ini';
  end if;
end;
$$;

-- The time is the server's, never the phone's. Outside the area is recorded and flagged, not refused.
create or replace function public.pf_clock_in(at_lat numeric, at_lng numeric, accuracy numeric, photo text, new_note text default '')
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  me uuid := public.pf_my_person_id();
  the_shift public.pf_shift;
  saved uuid;
begin
  if me is null then
    raise exception 'Akun Anda belum terdaftar di data orang. Hubungi Staf SDM.';
  end if;
  if not exists (select 1 from public.pf_attendance_consent c where c.person_id = me and c.withdrawn_at is null) then
    raise exception 'Setujui dulu pemakaian lokasi dan foto untuk absen';
  end if;
  perform public.pf_check_photo(me, photo);
  update public.pf_attendance a set missed_out = true
   where a.person_id = me and a.clock_out is null and not a.missed_out
     and (a.clock_in at time zone 'Asia/Jakarta')::date < public.pf_today();
  if exists (select 1 from public.pf_attendance a where a.person_id = me and a.clock_out is null and not a.missed_out) then
    raise exception 'Anda sudah absen masuk. Absen pulang dulu.';
  end if;
  select s.* into the_shift from public.pf_shift s
   where s.person_id = me and s.work_date = public.pf_today()
     and not exists (select 1 from public.pf_attendance x where x.shift_id = s.id)
   order by s.start_at limit 1;
  insert into public.pf_attendance (person_id, shift_id, clock_in, in_lat, in_lng, in_accuracy_m, in_photo_path, in_within_area, note)
  values (me, the_shift.id, now(), at_lat, at_lng, accuracy, photo, public.pf_within_area(the_shift.area_id, at_lat, at_lng, accuracy), trim(coalesce(new_note, '')))
  returning id into saved;
  return saved;
end;
$$;

create or replace function public.pf_clock_out(at_lat numeric, at_lng numeric, accuracy numeric, photo text, new_note text default '')
returns void
language plpgsql security definer set search_path = public
as $$
declare
  me uuid := public.pf_my_person_id();
  the_row public.pf_attendance;
  area uuid;
begin
  if me is null then
    raise exception 'Akun Anda belum terdaftar di data orang. Hubungi Staf SDM.';
  end if;
  perform public.pf_check_photo(me, photo);
  select * into the_row from public.pf_attendance a where a.person_id = me and a.clock_out is null and not a.missed_out for update;
  if not found then
    raise exception 'Belum ada absen masuk';
  end if;
  select s.area_id into area from public.pf_shift s where s.id = the_row.shift_id;
  update public.pf_attendance a
     set clock_out = now(), out_lat = at_lat, out_lng = at_lng, out_accuracy_m = accuracy, out_photo_path = photo,
         out_within_area = public.pf_within_area(area, at_lat, at_lng, accuracy),
         note = trim(concat_ws(' ', nullif(a.note, ''), nullif(trim(coalesce(new_note, '')), '')))
   where a.id = the_row.id;
end;
$$;

-- For someone with no phone or login, or who did not agree to location and photo.
create or replace function public.pf_attendance_manual(person uuid, came timestamptz, went timestamptz, why text)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  the_shift uuid;
  saved uuid;
begin
  perform public.pf_require(public.pf_can_manage_people());
  if coalesce(trim(why), '') = '' then
    raise exception 'Alasan wajib diisi';
  end if;
  if came is null or came > now() then
    raise exception 'Waktu masuk tidak boleh di masa depan';
  end if;
  if went is not null and went < came then
    raise exception 'Waktu pulang sebelum waktu masuk';
  end if;
  select s.id into the_shift from public.pf_shift s
   where s.person_id = person and s.work_date = (came at time zone 'Asia/Jakarta')::date
     and not exists (select 1 from public.pf_attendance x where x.shift_id = s.id)
   order by s.start_at limit 1;
  insert into public.pf_attendance (person_id, shift_id, clock_in, clock_out, source, note, missed_out)
  values (person, the_shift, came, went, 'manual', trim(why), went is null)
  returning id into saved;
  return saved;
end;
$$;

create or replace function public.pf_attendance_correct(attendance uuid, came timestamptz, went timestamptz, why text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  perform public.pf_require(public.pf_can_manage_people());
  if coalesce(trim(why), '') = '' then
    raise exception 'Alasan koreksi wajib diisi';
  end if;
  if came is null or (went is not null and went < came) then
    raise exception 'Waktu pulang sebelum waktu masuk';
  end if;
  update public.pf_attendance a
     set clock_in = came, clock_out = went, missed_out = (went is null and a.missed_out),
         note = trim(concat_ws(' · ', nullif(a.note, ''), 'Dikoreksi: ' || trim(why)))
   where a.id = attendance;
  if not found then
    raise exception 'Catatan absen tidak ditemukan';
  end if;
end;
$$;

-- Retention --------------------------------------------------------------------

create or replace function public.pf_photo_retention_days()
returns integer language sql immutable as $$ select 90; $$;

-- Photos past retention. The page removes the files, then marks them gone here.
create or replace function public.pf_photos_expired()
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  found_rows jsonb;
begin
  perform public.pf_require(public.pf_has_role(array['staf_sdm']));
  select coalesce(jsonb_agg(jsonb_build_object('id', a.id, 'paths', array_remove(array[a.in_photo_path, a.out_photo_path], null))), '[]'::jsonb) into found_rows
    from public.pf_attendance a
   where a.photos_removed_at is null
     and (a.in_photo_path is not null or a.out_photo_path is not null)
     and a.clock_in < now() - make_interval(days => public.pf_photo_retention_days());
  return found_rows;
end;
$$;

create or replace function public.pf_photos_mark_removed(attendances uuid[])
returns void
language plpgsql security definer set search_path = public
as $$
begin
  perform public.pf_require(public.pf_has_role(array['staf_sdm']));
  update public.pf_attendance a set in_photo_path = null, out_photo_path = null, photos_removed_at = now()
   where a.id = any (attendances) and a.clock_in < now() - make_interval(days => public.pf_photo_retention_days());
end;
$$;

-- 9. Hours per batch ------------------------------------------------------------

create or replace function public.pf_labor_add(person uuid, batch uuid, worked date, mins integer, what text default '')
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  who uuid := coalesce(person, public.pf_my_person_id());
  saved uuid;
begin
  if who is null then
    raise exception 'Akun Anda belum terdaftar di data orang. Hubungi Staf SDM.';
  end if;
  perform public.pf_require(who = public.pf_my_person_id() or public.pf_can_schedule());
  if not exists (select 1 from public.pf_batch b where b.id = batch and b.status <> 'direncanakan') then
    raise exception 'Batch belum disemai atau tidak ditemukan';
  end if;
  if worked is null or worked > public.pf_today() then
    raise exception 'Tanggal kerja tidak boleh di masa depan';
  end if;
  if mins is null or mins < 1 or mins > 960 then
    raise exception 'Durasi harus antara 1 menit dan 16 jam';
  end if;
  insert into public.pf_labor_log (person_id, batch_id, work_date, minutes, activity) values (who, batch, worked, mins, trim(coalesce(what, ''))) returning id into saved;
  return saved;
end;
$$;

create or replace function public.pf_labor_remove(entry uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  delete from public.pf_labor_log l
   where l.id = entry and (public.pf_can_schedule() or (l.person_id = public.pf_my_person_id() and l.created_at > now() - interval '7 days'));
  if not found then
    raise exception 'Catatan tidak bisa dihapus';
  end if;
end;
$$;

-- 10. Who may call what ---------------------------------------------------------

do $$
declare
  fn text;
begin
  foreach fn in array array[
    'pf_require(boolean)',
    'pf_check_photo(uuid, text)',
    'pf_distance_m(numeric, numeric, numeric, numeric)',
    'pf_within_area(uuid, numeric, numeric, numeric)'
  ] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', fn);
  end loop;
  foreach fn in array array[
    'pf_can_manage_people()',
    'pf_can_schedule()',
    'pf_can_read_people()',
    'pf_can_read_private()',
    'pf_my_person_id()',
    'pf_person_save(uuid, uuid, text, text, uuid, text, date, date, text)',
    'pf_contract_save(uuid, uuid, text, text, date, date, numeric, text, text)',
    'pf_work_area_save(uuid, text, numeric, numeric, integer, boolean)',
    'pf_shift_add(uuid, date[], time, time, uuid, text)',
    'pf_shift_remove(uuid)',
    'pf_leave_request(uuid, text, date, date, text)',
    'pf_leave_decide(uuid, boolean, text)',
    'pf_leave_cancel(uuid)',
    'pf_consent_accept()',
    'pf_consent_withdraw()',
    'pf_clock_in(numeric, numeric, numeric, text, text)',
    'pf_clock_out(numeric, numeric, numeric, text, text)',
    'pf_attendance_manual(uuid, timestamptz, timestamptz, text)',
    'pf_attendance_correct(uuid, timestamptz, timestamptz, text)',
    'pf_photo_retention_days()',
    'pf_photos_expired()',
    'pf_photos_mark_removed(uuid[])',
    'pf_labor_add(uuid, uuid, date, integer, text)',
    'pf_labor_remove(uuid)'
  ] loop
    execute format('revoke all on function public.%s from public, anon', fn);
    execute format('grant execute on function public.%s to authenticated', fn);
  end loop;
end;
$$;

-- 11. Audit ---------------------------------------------------------------------

do $$
declare
  audited text;
begin
  -- Not pf_attendance: its rows hold coordinates, which should not be copied into a log that outlives them.
  foreach audited in array array['pf_person', 'pf_work_area', 'pf_shift', 'pf_leave', 'pf_labor_log'] loop
    execute format('drop trigger if exists pf_audit on public.%I', audited);
    execute format(
      'create trigger pf_audit after insert or update or delete on public.%I for each row execute function public.pf_audit()',
      audited
    );
  end loop;
end;
$$;

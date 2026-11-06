-- ERP monitoring: devices and calibration, sensor readings, recipe targets and
-- alarms. Design: docs/erp-plant-factory/RENCANA-ERP-PLANT-FACTORY.md; the contract
-- for devices: docs/erp-plant-factory/API-SENSOR.md. Run manually in the Supabase
-- SQL editor after pf-foundation.sql and pf-batch.sql. Safe to run again. If
-- pf-foundation.sql is ever run again, run this file after it: it replaces
-- pf_recipe_new_version() so a new version keeps its targets.
--
-- Monitoring only: nothing here sends a command to a device. Devices write with
-- their own token through pf_ingest(), so no secret key is involved. Only a hash
-- of each token is stored, in a table no user can read.

-- 1. Roles ---------------------------------------------------------------------

create or replace function public.pf_can_maintain()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.pf_is_admin() or public.pf_has_role(array['teknisi']);
$$;

-- 2. Tables --------------------------------------------------------------------

create table if not exists public.pf_asset (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  name        text not null,
  kind        text not null check (kind in ('iklim', 'nutrisi')),
  model       text not null default '',
  serial      text not null default '',
  location_id uuid not null references public.pf_location (id),
  metrics     text[] not null check (cardinality(metrics) > 0),
  -- How often it should report. Decides when it counts as silent; firmware may change it.
  interval_s  integer not null default 300 check (interval_s > 0),
  status      text not null default 'aktif' check (status in ('aktif', 'perawatan', 'pensiun')),
  last_seen_at timestamptz,
  notes       text not null default '',
  created_at  timestamptz not null default now()
);

-- Apart from pf_asset, with no policy at all: members read devices, nobody reads this.
create table if not exists public.pf_asset_token (
  asset_id   uuid primary key references public.pf_asset (id) on delete cascade,
  token_hash text not null unique,
  issued_at  timestamptz not null default now(),
  issued_by  uuid
);

create table if not exists public.pf_calibration (
  id            uuid primary key default gen_random_uuid(),
  asset_id      uuid not null references public.pf_asset (id) on delete cascade,
  metric        text not null,
  calibrated_at timestamptz not null default now(),
  offset_value  numeric not null default 0,
  slope         numeric not null default 1 check (slope <> 0),
  next_due      date,
  by_id         uuid,
  notes         text not null default ''
);
create index if not exists pf_calibration_asset_idx on public.pf_calibration (asset_id, metric, calibrated_at desc);

create table if not exists public.pf_sensor_reading (
  asset_id    uuid not null references public.pf_asset (id),
  location_id uuid not null references public.pf_location (id),
  metric      text not null,
  ts          timestamptz not null,
  value       numeric not null,
  raw         numeric not null,
  primary key (asset_id, metric, ts)
) partition by range (ts);
create index if not exists pf_sensor_reading_ts_brin on public.pf_sensor_reading using brin (ts);
create index if not exists pf_sensor_reading_place_idx on public.pf_sensor_reading (location_id, metric, ts desc);

-- Added to on every reading rather than by a scheduled job, so it needs no pg_cron
-- and a chart never waits for the next run.
create table if not exists public.pf_reading_hourly (
  location_id uuid not null references public.pf_location (id),
  metric      text not null,
  hour        timestamptz not null,
  n           integer not null,
  sum_value   numeric not null,
  min_value   numeric not null,
  max_value   numeric not null,
  primary key (location_id, metric, hour)
);

create table if not exists public.pf_reading_latest (
  asset_id    uuid not null references public.pf_asset (id) on delete cascade,
  metric      text not null,
  location_id uuid not null references public.pf_location (id),
  ts          timestamptz not null,
  value       numeric not null,
  primary key (asset_id, metric)
);

-- By recipe and phase name rather than phase id: saving a draft's phases rewrites them.
create table if not exists public.pf_recipe_target (
  id        uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.pf_recipe (id) on delete cascade,
  phase     text not null,
  metric    text not null,
  low       numeric,
  target    numeric,
  high      numeric,
  unique (recipe_id, phase, metric),
  check (low is null or high is null or low <= high)
);

create table if not exists public.pf_ingest_log (
  id          bigint generated always as identity primary key,
  asset_id    uuid references public.pf_asset (id) on delete cascade,
  received_at timestamptz not null default now(),
  accepted    integer not null default 0,
  duplicates  integer not null default 0,
  rejected    integer not null default 0,
  error       text not null default ''
);
create index if not exists pf_ingest_log_asset_idx on public.pf_ingest_log (asset_id, received_at desc);

create table if not exists public.pf_alarm_rule (
  id          uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.pf_location (id),
  metric      text not null,
  warn_low    numeric,
  warn_high   numeric,
  crit_low    numeric,
  crit_high   numeric,
  delay_s     integer not null default 300 check (delay_s >= 0),
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  unique (location_id, metric),
  check (coalesce(warn_low, warn_high, crit_low, crit_high) is not null)
);

create table if not exists public.pf_alarm (
  id        uuid primary key default gen_random_uuid(),
  rule_id   uuid not null references public.pf_alarm_rule (id) on delete cascade,
  asset_id  uuid not null references public.pf_asset (id) on delete cascade,
  metric    text not null,
  level     text not null check (level in ('peringatan', 'kritis')),
  value     numeric not null,
  opened_at timestamptz not null,
  ack_by    uuid,
  ack_at    timestamptz,
  closed_at timestamptz
);
create unique index if not exists pf_alarm_one_open on public.pf_alarm (rule_id, asset_id) where closed_at is null;
create index if not exists pf_alarm_opened_idx on public.pf_alarm (opened_at desc);

-- A reading out of range, not yet out of range long enough to raise an alarm.
create table if not exists public.pf_alarm_watch (
  rule_id  uuid not null references public.pf_alarm_rule (id) on delete cascade,
  asset_id uuid not null references public.pf_asset (id) on delete cascade,
  since    timestamptz not null,
  primary key (rule_id, asset_id)
);

-- 3. Partitions: one per month, each shut to every direct caller -----------------

create or replace function public.pf_reading_shut(partition_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  execute format('alter table public.%I enable row level security', partition_name);
  execute format('revoke all on public.%I from public, anon, authenticated', partition_name);
end;
$$;

create or replace function public.pf_reading_ensure_partition(month date)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  first_day date := date_trunc('month', month)::date;
  partition_name text := 'pf_sensor_reading_' || to_char(first_day, 'YYYY_MM');
begin
  if to_regclass('public.' || partition_name) is not null then
    return;
  end if;
  execute format(
    'create table public.%I partition of public.pf_sensor_reading for values from (%L) to (%L)',
    partition_name, first_day::timestamptz, (first_day + interval '1 month')::timestamptz
  );
  perform public.pf_reading_shut(partition_name);
end;
$$;

create table if not exists public.pf_sensor_reading_default partition of public.pf_sensor_reading default;
select public.pf_reading_shut('pf_sensor_reading_default');
select public.pf_reading_ensure_partition((date_trunc('month', now()) + make_interval(months => m))::date)
  from generate_series(-1, 2) as m;

-- 4. Views ---------------------------------------------------------------------

create or replace view public.pf_asset_overview with (security_invoker = true) as
select
  a.id, a.code, a.name, a.kind, a.model, a.serial, a.location_id, a.metrics, a.interval_s,
  a.status, a.last_seen_at, a.notes, a.created_at,
  l.code as location_code,
  l.name as location_name,
  case
    when a.status <> 'aktif' then a.status
    when a.last_seen_at is null then 'belum_mengirim'
    when now() - a.last_seen_at > make_interval(secs => a.interval_s * 3) then 'terlambat'
    else 'online'
  end as link_state,
  (select min(c.next_due) from (
     select distinct on (metric) metric, next_due from public.pf_calibration
      where asset_id = a.id order by metric, calibrated_at desc
   ) c) as next_due,
  exists (select 1 from public.pf_calibration c where c.asset_id = a.id) as calibrated
from public.pf_asset a
join public.pf_location l on l.id = a.location_id;

create or replace view public.pf_reading_latest_view with (security_invoker = true) as
select r.asset_id, r.metric, r.location_id, r.ts, r.value, a.code as asset_code, l.code as location_code
from public.pf_reading_latest r
join public.pf_asset a on a.id = r.asset_id
join public.pf_location l on l.id = r.location_id
where a.status <> 'pensiun';

create or replace view public.pf_alarm_overview with (security_invoker = true) as
select
  x.id, x.rule_id, x.asset_id, x.metric, x.level, x.value, x.opened_at, x.ack_by, x.ack_at, x.closed_at,
  a.code as asset_code,
  l.code as location_code,
  r.warn_low, r.warn_high, r.crit_low, r.crit_high,
  x.closed_at is null as open
from public.pf_alarm x
join public.pf_asset a on a.id = x.asset_id
join public.pf_alarm_rule r on r.id = x.rule_id
join public.pf_location l on l.id = r.location_id;

-- 5. Row level security: everything is read by lab members, written by functions --

do $$
declare
  t text;
begin
  foreach t in array array['pf_asset', 'pf_calibration', 'pf_sensor_reading', 'pf_reading_hourly', 'pf_reading_latest',
                           'pf_recipe_target', 'pf_ingest_log', 'pf_alarm_rule', 'pf_alarm'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_read', t);
    execute format('create policy %I on public.%I for select to authenticated using (public.is_lab_member())', t || '_read', t);
    execute format('revoke insert, update, delete, truncate on public.%I from public, anon, authenticated', t);
  end loop;
  foreach t in array array['pf_asset_token', 'pf_alarm_watch'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from public, anon, authenticated', t);
  end loop;
end;
$$;

-- 6. Alarms --------------------------------------------------------------------

create or replace function public.pf_alarm_level(rule public.pf_alarm_rule, reading numeric)
returns text
language sql
immutable
as $$
  select case
    when reading < rule.crit_low or reading > rule.crit_high then 'kritis'
    when reading < rule.warn_low or reading > rule.warn_high then 'peringatan'
    else null
  end;
$$;

-- One new reading against its rule. Called only for a reading newer than any before.
create or replace function public.pf_alarm_evaluate(asset uuid, place uuid, metric_key text, at_ts timestamptz, reading numeric)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  rule public.pf_alarm_rule;
  level_now text;
  began timestamptz;
begin
  select * into rule from public.pf_alarm_rule r where r.location_id = place and r.metric = metric_key and r.active;
  if not found then
    return;
  end if;
  level_now := public.pf_alarm_level(rule, reading);
  if level_now is null then
    delete from public.pf_alarm_watch w where w.rule_id = rule.id and w.asset_id = asset;
    update public.pf_alarm a set closed_at = at_ts where a.rule_id = rule.id and a.asset_id = asset and a.closed_at is null;
    return;
  end if;
  insert into public.pf_alarm_watch (rule_id, asset_id, since) values (rule.id, asset, at_ts)
  on conflict (rule_id, asset_id) do nothing;
  select w.since into began from public.pf_alarm_watch w where w.rule_id = rule.id and w.asset_id = asset;
  if at_ts - began < make_interval(secs => rule.delay_s) then
    return;
  end if;
  -- An open alarm climbs to critical but does not fall back; closing it is what ends it.
  insert into public.pf_alarm (rule_id, asset_id, metric, level, value, opened_at)
  values (rule.id, asset, metric_key, level_now, reading, at_ts)
  on conflict (rule_id, asset_id) where closed_at is null do update
    set value = excluded.value,
        level = case when excluded.level = 'kritis' then 'kritis' else public.pf_alarm.level end;
end;
$$;

-- 7. Ingest --------------------------------------------------------------------

create or replace function public.pf_metric_plausible(metric_key text, reading numeric)
returns boolean
language sql
immutable
as $$
  select case metric_key
    when 'suhu' then reading between -10 and 60
    when 'rh' then reading between 0 and 100
    when 'vpd' then reading between 0 and 10
    when 'co2' then reading between 0 and 10000
    when 'cahaya' then reading between 0 and 200000
    when 'ph' then reading between 0 and 14
    when 'ec' then reading between 0 and 20
    when 'do' then reading between 0 and 30
    when 'suhu_larutan' then reading between 0 and 60
    else false
  end;
$$;

create or replace function public.pf_ingest(token text, readings jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  device public.pf_asset;
  item jsonb;
  metric_key text;
  raw_value numeric;
  at_ts timestamptz;
  calibrated numeric;
  cal record;
  inserted integer;
  newest timestamptz;
  accepted integer := 0;
  duplicates integer := 0;
  rejected integer := 0;
  errors text[] := '{}';
  why text;
begin
  select a.* into device
    from public.pf_asset_token t
    join public.pf_asset a on a.id = t.asset_id
   where t.token_hash = encode(sha256(convert_to(coalesce(token, ''), 'UTF8')), 'hex');
  if not found or device.status = 'pensiun' then
    raise exception 'Token perangkat tidak dikenal' using errcode = '28000';
  end if;
  if jsonb_typeof(readings) is distinct from 'array' then
    raise exception 'readings harus berupa daftar';
  end if;
  if jsonb_array_length(readings) > 1000 then
    raise exception 'Paling banyak 1000 bacaan per kiriman';
  end if;

  perform public.pf_reading_ensure_partition(now()::date);
  perform public.pf_reading_ensure_partition((now() + interval '1 month')::date);

  for item in select * from jsonb_array_elements(readings) loop
    why := null;
    begin
      metric_key := item ->> 'metric';
      raw_value := (item ->> 'value')::numeric;
      at_ts := (item ->> 'ts')::timestamptz;
    exception when others then
      why := 'format';
    end;
    if why is null and (metric_key is null or raw_value is null or at_ts is null) then
      why := 'format';
    elsif why is null and not (metric_key = any (device.metrics)) then
      why := 'metrik ' || metric_key || ' tidak terdaftar';
    elsif why is null and at_ts > now() + interval '5 minutes' then
      why := 'waktu di masa depan';
    elsif why is null and at_ts < now() - interval '30 days' then
      why := 'waktu lebih dari 30 hari lalu';
    end if;

    if why is null then
      select c.offset_value, c.slope into cal from public.pf_calibration c
       where c.asset_id = device.id and c.metric = metric_key and c.calibrated_at <= at_ts
       order by c.calibrated_at desc limit 1;
      calibrated := case when cal is null then raw_value else raw_value * cal.slope + cal.offset_value end;
      if not public.pf_metric_plausible(metric_key, calibrated) then
        why := 'nilai ' || metric_key || ' di luar batas wajar';
      end if;
    end if;

    if why is not null then
      rejected := rejected + 1;
      if cardinality(errors) < 5 then
        errors := errors || why;
      end if;
      continue;
    end if;

    insert into public.pf_sensor_reading (asset_id, location_id, metric, ts, value, raw)
    values (device.id, device.location_id, metric_key, at_ts, calibrated, raw_value)
    on conflict (asset_id, metric, ts) do nothing;
    get diagnostics inserted = row_count;
    if inserted = 0 then
      duplicates := duplicates + 1;
      continue;
    end if;
    accepted := accepted + 1;

    insert into public.pf_reading_hourly as h (location_id, metric, hour, n, sum_value, min_value, max_value)
    values (device.location_id, metric_key, date_trunc('hour', at_ts), 1, calibrated, calibrated, calibrated)
    on conflict (location_id, metric, hour) do update
      set n = h.n + 1,
          sum_value = h.sum_value + excluded.sum_value,
          min_value = least(h.min_value, excluded.min_value),
          max_value = greatest(h.max_value, excluded.max_value);

    -- A late reading fills the history but says nothing about now.
    select l.ts into newest from public.pf_reading_latest l where l.asset_id = device.id and l.metric = metric_key;
    if newest is null or at_ts > newest then
      insert into public.pf_reading_latest as l (asset_id, metric, location_id, ts, value)
      values (device.id, metric_key, device.location_id, at_ts, calibrated)
      on conflict (asset_id, metric) do update set location_id = excluded.location_id, ts = excluded.ts, value = excluded.value;
      if device.status = 'aktif' then
        perform public.pf_alarm_evaluate(device.id, device.location_id, metric_key, at_ts, calibrated);
      end if;
    end if;
  end loop;

  update public.pf_asset a set last_seen_at = now() where a.id = device.id;
  insert into public.pf_ingest_log (asset_id, accepted, duplicates, rejected, error)
  values (device.id, accepted, duplicates, rejected, array_to_string(errors, '; '));

  return jsonb_build_object('accepted', accepted, 'duplicates', duplicates, 'rejected', rejected, 'errors', to_jsonb(errors));
end;
$$;

-- 8. What the pages call --------------------------------------------------------

-- Raw readings in five-minute steps up to two days back, hourly summaries beyond,
-- so a chart never carries more than a few hundred points.
create or replace function public.pf_reading_series(place uuid, metric_key text, hours integer)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  span interval := make_interval(hours => least(greatest(coalesce(hours, 24), 1), 2160));
  points jsonb;
begin
  if not public.is_lab_member() then
    raise exception 'Akun Anda tidak punya izin untuk tindakan ini.' using errcode = '42501';
  end if;
  if hours <= 48 then
    select coalesce(jsonb_agg(jsonb_build_object('t', b.t, 'v', round(b.v, 3), 'lo', round(b.lo, 3), 'hi', round(b.hi, 3)) order by b.t), '[]'::jsonb) into points
      from (
        select date_bin('5 minutes', r.ts, timestamptz '2000-01-01') as t, avg(r.value) as v, min(r.value) as lo, max(r.value) as hi
          from public.pf_sensor_reading r
         where r.location_id = place and r.metric = metric_key and r.ts >= now() - span
         group by 1
      ) b;
    return jsonb_build_object('stepMinutes', 5, 'points', points);
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('t', h.hour, 'v', round(h.sum_value / h.n, 3), 'lo', round(h.min_value, 3), 'hi', round(h.max_value, 3)) order by h.hour), '[]'::jsonb) into points
    from public.pf_reading_hourly h
   where h.location_id = place and h.metric = metric_key and h.hour >= now() - span;
  return jsonb_build_object('stepMinutes', 60, 'points', points);
end;
$$;

create or replace function public.pf_asset_place_ok(place uuid)
returns void
language plpgsql
stable
set search_path = public
as $$
begin
  if not exists (select 1 from public.pf_location l where l.id = place and l.level in ('room', 'chamber')) then
    raise exception 'Perangkat dan aturan alarm dipasang di ruang atau chamber';
  end if;
end;
$$;

create or replace function public.pf_asset_save(asset uuid, new_code text, new_name text, new_kind text, new_model text, new_serial text, place uuid, new_metrics text[], every_s integer, new_status text default 'aktif', new_notes text default '')
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  saved uuid;
  metric_key text;
begin
  if not public.pf_can_maintain() then
    raise exception 'Akun Anda tidak punya izin untuk tindakan ini.' using errcode = '42501';
  end if;
  if coalesce(trim(new_code), '') = '' or coalesce(trim(new_name), '') = '' then
    raise exception 'Kode dan nama perangkat wajib diisi';
  end if;
  perform public.pf_asset_place_ok(place);
  if coalesce(cardinality(new_metrics), 0) = 0 then
    raise exception 'Pilih minimal satu jenis bacaan';
  end if;
  foreach metric_key in array new_metrics loop
    if not public.pf_metric_plausible(metric_key, 0) then
      raise exception 'Jenis bacaan % tidak dikenal', metric_key;
    end if;
  end loop;
  if asset is null then
    insert into public.pf_asset (code, name, kind, model, serial, location_id, metrics, interval_s, status, notes)
    values (upper(trim(new_code)), trim(new_name), new_kind, trim(coalesce(new_model, '')), trim(coalesce(new_serial, '')), place, new_metrics, every_s, new_status, trim(coalesce(new_notes, '')))
    returning id into saved;
  else
    update public.pf_asset a
       set code = upper(trim(new_code)), name = trim(new_name), kind = new_kind, model = trim(coalesce(new_model, '')), serial = trim(coalesce(new_serial, '')),
           location_id = place, metrics = new_metrics, interval_s = every_s, status = new_status, notes = trim(coalesce(new_notes, ''))
     where a.id = asset
    returning a.id into saved;
    if saved is null then
      raise exception 'Perangkat tidak ditemukan';
    end if;
  end if;
  return saved;
end;
$$;

-- Hands the token out once. Issuing a new one cuts off the old one at once.
create or replace function public.pf_asset_issue_token(asset uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  fresh text := 'pfd_' || replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
begin
  if not public.pf_can_maintain() then
    raise exception 'Akun Anda tidak punya izin untuk tindakan ini.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.pf_asset a where a.id = asset) then
    raise exception 'Perangkat tidak ditemukan';
  end if;
  insert into public.pf_asset_token as t (asset_id, token_hash, issued_at, issued_by)
  values (asset, encode(sha256(convert_to(fresh, 'UTF8')), 'hex'), now(), auth.uid())
  on conflict (asset_id) do update set token_hash = excluded.token_hash, issued_at = excluded.issued_at, issued_by = excluded.issued_by;
  return fresh;
end;
$$;

create or replace function public.pf_calibration_add(asset uuid, metric_key text, new_offset numeric, new_slope numeric, due date, new_notes text default '')
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  listed text[];
begin
  if not public.pf_can_maintain() then
    raise exception 'Akun Anda tidak punya izin untuk tindakan ini.' using errcode = '42501';
  end if;
  select a.metrics into listed from public.pf_asset a where a.id = asset;
  if listed is null or not (metric_key = any (listed)) then
    raise exception 'Perangkat ini tidak mengirim bacaan itu';
  end if;
  if coalesce(new_slope, 0) = 0 then
    raise exception 'Faktor pengali tidak boleh nol';
  end if;
  insert into public.pf_calibration (asset_id, metric, offset_value, slope, next_due, by_id, notes)
  values (asset, metric_key, coalesce(new_offset, 0), new_slope, due, auth.uid(), trim(coalesce(new_notes, '')));
end;
$$;

create or replace function public.pf_alarm_rule_save(place uuid, metric_key text, warn_lo numeric, warn_hi numeric, crit_lo numeric, crit_hi numeric, wait_s integer, is_active boolean default true)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  saved uuid;
begin
  if not (public.pf_can_maintain() or public.pf_can_manage_production()) then
    raise exception 'Akun Anda tidak punya izin untuk tindakan ini.' using errcode = '42501';
  end if;
  perform public.pf_asset_place_ok(place);
  if coalesce(warn_lo, warn_hi, crit_lo, crit_hi) is null then
    raise exception 'Isi minimal satu batas';
  end if;
  if warn_lo > warn_hi or crit_lo > crit_hi or crit_lo > warn_lo or crit_hi < warn_hi then
    raise exception 'Batas tidak berurutan: kritis harus di luar peringatan, bawah di bawah atas';
  end if;
  insert into public.pf_alarm_rule as r (location_id, metric, warn_low, warn_high, crit_low, crit_high, delay_s, active)
  values (place, metric_key, warn_lo, warn_hi, crit_lo, crit_hi, coalesce(wait_s, 300), coalesce(is_active, true))
  on conflict (location_id, metric) do update
    set warn_low = excluded.warn_low, warn_high = excluded.warn_high, crit_low = excluded.crit_low, crit_high = excluded.crit_high,
        delay_s = excluded.delay_s, active = excluded.active
  returning r.id into saved;
  -- A rule switched off stops speaking for its open alarms.
  if not coalesce(is_active, true) then
    update public.pf_alarm a set closed_at = now() where a.rule_id = saved and a.closed_at is null;
    delete from public.pf_alarm_watch w where w.rule_id = saved;
  end if;
  return saved;
end;
$$;

create or replace function public.pf_alarm_ack(alarm uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (public.pf_can_operate() or public.pf_can_maintain()) then
    raise exception 'Akun Anda tidak punya izin untuk tindakan ini.' using errcode = '42501';
  end if;
  update public.pf_alarm a set ack_by = auth.uid(), ack_at = now() where a.id = alarm and a.closed_at is null and a.ack_at is null;
  if not found then
    raise exception 'Alarm sudah ditangani atau sudah tertutup';
  end if;
end;
$$;

-- Targets belong to a draft, like its phases.
create or replace function public.pf_recipe_targets_save(recipe uuid, phase_key text, targets jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  state text;
  item jsonb;
begin
  if not public.pf_can_manage_production() then
    raise exception 'Akun Anda tidak punya izin untuk tindakan ini.' using errcode = '42501';
  end if;
  select r.status into state from public.pf_recipe r where r.id = recipe;
  if state is distinct from 'draft' then
    raise exception 'Acuan hanya bisa diubah pada draf resep. Buat versi baru.';
  end if;
  delete from public.pf_recipe_target t where t.recipe_id = recipe and t.phase = phase_key;
  for item in select * from jsonb_array_elements(coalesce(targets, '[]'::jsonb)) loop
    insert into public.pf_recipe_target (recipe_id, phase, metric, low, target, high)
    values (recipe, phase_key, item ->> 'metric', (item ->> 'low')::numeric, (item ->> 'target')::numeric, (item ->> 'high')::numeric);
  end loop;
end;
$$;

create or replace function public.pf_recipe_new_version(recipe uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  source public.pf_recipe;
  created uuid;
begin
  if not public.pf_can_manage_production() then
    raise exception 'Akun Anda tidak punya izin untuk tindakan ini.' using errcode = '42501';
  end if;
  select * into source from public.pf_recipe where id = recipe;
  if not found then
    raise exception 'Resep tidak ditemukan';
  end if;
  if exists (select 1 from public.pf_recipe where code = source.code and status = 'draft') then
    raise exception 'Resep % masih punya draf. Selesaikan dulu draf itu.', source.code;
  end if;
  insert into public.pf_recipe (crop_id, code, version, parent_version_id, notes)
  values (source.crop_id, source.code, (select max(version) + 1 from public.pf_recipe where code = source.code), source.id, source.notes)
  returning id into created;
  insert into public.pf_recipe_phase (recipe_id, phase, seq, duration_days, photoperiod_h, ppfd_umol)
  select created, phase, seq, duration_days, photoperiod_h, ppfd_umol
    from public.pf_recipe_phase where recipe_id = source.id;
  insert into public.pf_recipe_target (recipe_id, phase, metric, low, target, high)
  select created, phase, metric, low, target, high
    from public.pf_recipe_target where recipe_id = source.id;
  return created;
end;
$$;

-- 9. Who may call what ----------------------------------------------------------

do $$
declare
  fn text;
begin
  foreach fn in array array[
    'pf_reading_shut(text)',
    'pf_reading_ensure_partition(date)',
    'pf_alarm_evaluate(uuid, uuid, text, timestamptz, numeric)',
    'pf_alarm_level(public.pf_alarm_rule, numeric)',
    'pf_metric_plausible(text, numeric)',
    'pf_asset_place_ok(uuid)'
  ] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', fn);
  end loop;
  foreach fn in array array[
    'pf_can_maintain()',
    'pf_reading_series(uuid, text, integer)',
    'pf_asset_save(uuid, text, text, text, text, text, uuid, text[], integer, text, text)',
    'pf_asset_issue_token(uuid)',
    'pf_calibration_add(uuid, text, numeric, numeric, date, text)',
    'pf_alarm_rule_save(uuid, text, numeric, numeric, numeric, numeric, integer, boolean)',
    'pf_alarm_ack(uuid)',
    'pf_recipe_targets_save(uuid, text, jsonb)',
    'pf_recipe_new_version(uuid)'
  ] loop
    execute format('revoke all on function public.%s from public, anon', fn);
    execute format('grant execute on function public.%s to authenticated', fn);
  end loop;
  -- A device has no login: its token is checked inside.
  revoke all on function public.pf_ingest(text, jsonb) from public;
  grant execute on function public.pf_ingest(text, jsonb) to anon, authenticated;
end;
$$;

-- 10. Audit: readings and alarms are their own history -------------------------

do $$
declare
  audited text;
begin
  foreach audited in array array['pf_asset', 'pf_calibration', 'pf_alarm_rule', 'pf_recipe_target'] loop
    execute format('drop trigger if exists pf_audit on public.%I', audited);
    execute format(
      'create trigger pf_audit after insert or update or delete on public.%I for each row execute function public.pf_audit()',
      audited
    );
  end loop;
end;
$$;

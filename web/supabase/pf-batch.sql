-- ERP growing records: seed lots, batches from sowing to harvest, and what sits
-- where. Design: docs/erp-plant-factory/RENCANA-ERP-PLANT-FACTORY.md. Run manually
-- in the Supabase SQL editor after pf-foundation.sql. Safe to run again.
--
-- Any lab member may read. Every write goes through a function below, which
-- checks the caller's role and keeps slots, stock and the event log in step, so
-- no table here has a write policy. Nothing needs a secret key: the functions run
-- from the signed-in user's token and auth.uid() still names that person.

-- 1. A tier between batches is being cleaned ----------------------------------
alter table public.pf_location drop constraint if exists pf_location_slot_status_check;
alter table public.pf_location add constraint pf_location_slot_status_check
  check (slot_status in ('available', 'maintenance', 'retired', 'sanitasi'));

-- 2. Tables --------------------------------------------------------------------
create sequence if not exists public.pf_item_sku_seq;
create sequence if not exists public.pf_batch_code_seq;
create sequence if not exists public.pf_harvest_code_seq;

-- Tahap 4 adds the other categories and purchasing on top of these two tables.
create table if not exists public.pf_item (
  id         uuid primary key default gen_random_uuid(),
  sku        text not null unique default 'BNH-' || lpad(nextval('public.pf_item_sku_seq')::text, 3, '0'),
  name       text not null,
  category   text not null default 'benih' check (category in ('benih')),
  unit       text not null check (unit in ('biji', 'gram')),
  crop_id    uuid references public.pf_crop (id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (crop_id, unit)
);

create table if not exists public.pf_stock_lot (
  id          uuid primary key default gen_random_uuid(),
  item_id     uuid not null references public.pf_item (id) on delete restrict,
  lot_no      text not null check (length(trim(lot_no)) > 0),
  supplier    text not null default '',
  qty_on_hand numeric(12, 2) not null default 0 check (qty_on_hand >= 0),
  received_at date not null,
  expiry_date date,
  notes       text not null default '',
  created_at  timestamptz not null default now(),
  unique (item_id, lot_no)
);

-- A batch uses one seed lot, so a harvest traces back to exactly one. Its stage
-- is not stored: it follows from where its plants are and the recipe's days.
create table if not exists public.pf_batch (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique default 'B-' || lpad(nextval('public.pf_batch_code_seq')::text, 3, '0'),
  recipe_id   uuid not null references public.pf_recipe (id) on delete restrict,
  seed_lot_id uuid not null references public.pf_stock_lot (id) on delete restrict,
  status      text not null default 'direncanakan' check (status in ('direncanakan', 'berjalan', 'selesai', 'gagal')),
  sown_at     date,
  notes       text not null default '',
  created_by  uuid default auth.uid() references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  finished_at timestamptz
);
create index if not exists pf_batch_status_idx on public.pf_batch (status);

create table if not exists public.pf_stock_move (
  id         bigint generated always as identity primary key,
  lot_id     uuid not null references public.pf_stock_lot (id) on delete restrict,
  type       text not null check (type in ('masuk', 'pakai_semai', 'koreksi')),
  qty        numeric(12, 2) not null check (qty <> 0),
  batch_id   uuid references public.pf_batch (id) on delete restrict,
  reason     text not null default '',
  by_id      uuid default auth.uid() references auth.users (id) on delete set null,
  at         timestamptz not null default now()
);
create index if not exists pf_stock_move_lot_idx on public.pf_stock_move (lot_id, at desc);

-- Who was where and when. A tray holds many seedlings; a hole holds one plant.
create table if not exists public.pf_batch_slot (
  id             uuid primary key default gen_random_uuid(),
  batch_id       uuid not null references public.pf_batch (id) on delete restrict,
  location_id    uuid not null references public.pf_location (id) on delete restrict,
  kind           text not null check (kind in ('tray', 'hole')),
  source_slot_id uuid references public.pf_batch_slot (id) on delete restrict,
  qty            integer not null check (qty > 0),
  germinated     integer not null default 0 check (germinated >= 0),
  moved          integer not null default 0 check (moved >= 0),
  state          text not null check (state in ('disemai', 'berkecambah', 'siap_pindah', 'tumbuh', 'masalah')),
  note           text not null default '',
  placed_at      timestamptz not null default now(),
  removed_at     timestamptz,
  constraint pf_batch_slot_counts check (germinated + moved <= qty),
  constraint pf_batch_slot_state check (
    (kind = 'tray' and state in ('disemai', 'berkecambah', 'siap_pindah', 'masalah'))
    or (kind = 'hole' and state in ('tumbuh', 'masalah'))
  )
);
create unique index if not exists pf_batch_slot_one_occupant on public.pf_batch_slot (location_id) where removed_at is null;
create index if not exists pf_batch_slot_batch_idx on public.pf_batch_slot (batch_id);

-- The batch's diary. Records are added, never edited.
create table if not exists public.pf_batch_event (
  id            bigint generated always as identity primary key,
  batch_id      uuid not null references public.pf_batch (id) on delete restrict,
  type          text not null check (type in ('dibuat', 'semai', 'germinasi', 'nampan_ditutup', 'pindah_tanam', 'masalah', 'pulih', 'tanaman_dibuang', 'pengamatan', 'panen', 'koreksi_panen', 'selesai', 'gagal')),
  at            timestamptz not null default now(),
  qty           numeric(12, 2),
  location_code text,
  note          text not null default '',
  by_id         uuid default auth.uid() references auth.users (id) on delete set null
);
create index if not exists pf_batch_event_batch_idx on public.pf_batch_event (batch_id, at desc);

create table if not exists public.pf_harvest_lot (
  id           uuid primary key default gen_random_uuid(),
  lot_code     text not null unique default 'H-' || lpad(nextval('public.pf_harvest_code_seq')::text, 4, '0'),
  batch_id     uuid not null references public.pf_batch (id) on delete restrict,
  harvested_at date not null,
  fresh_kg     numeric(10, 3) not null check (fresh_kg > 0),
  remaining_kg numeric(10, 3) not null check (remaining_kg >= 0),
  grade        text not null check (grade in ('A', 'B', 'Afkir')),
  best_before  date,
  notes        text not null default '',
  by_id        uuid default auth.uid() references auth.users (id) on delete set null,
  created_at   timestamptz not null default now()
);
create index if not exists pf_harvest_lot_batch_idx on public.pf_harvest_lot (batch_id);

-- 3. What the pages read. Both views keep the caller's RLS. --------------------
create or replace view public.pf_batch_overview with (security_invoker = true) as
select
  b.id, b.code, b.status, b.sown_at, b.notes, b.created_at, b.finished_at,
  b.recipe_id, r.code as recipe_code, r.version as recipe_version,
  r.crop_id, c.name as crop_name, c.variety as crop_variety,
  b.seed_lot_id, l.lot_no as seed_lot_no,
  coalesce(s.seeds, 0)::integer as seeds,
  coalesce(s.germinated, 0)::integer as germinated,
  coalesce(s.trays_now, 0)::integer as trays_now,
  coalesce(s.plants_now, 0)::integer as plants_now,
  s.transplanted_at,
  coalesce(h.harvested_kg, 0) as harvested_kg,
  coalesce(p.cycle_days, 0)::integer as cycle_days
from public.pf_batch b
join public.pf_recipe r on r.id = b.recipe_id
join public.pf_crop c on c.id = r.crop_id
join public.pf_stock_lot l on l.id = b.seed_lot_id
left join lateral (
  select
    sum(qty) filter (where kind = 'tray') as seeds,
    sum(germinated + moved) filter (where kind = 'tray') as germinated,
    count(*) filter (where kind = 'tray' and removed_at is null) as trays_now,
    count(*) filter (where kind = 'hole' and removed_at is null) as plants_now,
    min(placed_at) filter (where kind = 'hole') as transplanted_at
  from public.pf_batch_slot where batch_id = b.id
) s on true
left join lateral (select sum(fresh_kg) as harvested_kg from public.pf_harvest_lot where batch_id = b.id) h on true
left join lateral (select sum(duration_days) as cycle_days from public.pf_recipe_phase where recipe_id = b.recipe_id) p on true;

create or replace view public.pf_slot_open with (security_invoker = true) as
select
  s.id, s.batch_id, b.code as batch_code, s.location_id, loc.code as location_code, s.kind,
  s.qty, s.germinated, s.moved, s.state, s.note, s.placed_at, src.code as source_code
from public.pf_batch_slot s
join public.pf_batch b on b.id = s.batch_id
join public.pf_location loc on loc.id = s.location_id
left join public.pf_batch_slot sp on sp.id = s.source_slot_id
left join public.pf_location src on src.id = sp.location_id
where s.removed_at is null;

create or replace view public.pf_seed_lot_overview with (security_invoker = true) as
select
  l.id, l.lot_no, l.supplier, l.qty_on_hand, l.received_at, l.expiry_date, l.notes,
  i.unit, i.crop_id, c.name as crop_name, c.variety as crop_variety
from public.pf_stock_lot l
join public.pf_item i on i.id = l.item_id
join public.pf_crop c on c.id = i.crop_id;

revoke all on public.pf_batch_overview, public.pf_slot_open, public.pf_seed_lot_overview from anon;
grant select on public.pf_batch_overview, public.pf_slot_open, public.pf_seed_lot_overview to authenticated;

-- 4. Who may do what ------------------------------------------------------------
create or replace function public.pf_can_operate()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.pf_can_manage_production() or public.pf_has_role(array['operator']);
$$;

create or replace function public.pf_require_operator()
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.pf_can_operate() then
    raise exception 'Your account does not have permission for this.' using errcode = '42501';
  end if;
end;
$$;

create or replace function public.pf_require_manager()
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.pf_can_manage_production() then
    raise exception 'Your account does not have permission for this.' using errcode = '42501';
  end if;
end;
$$;

create or replace function public.pf_today()
returns date
language sql
stable
as $$
  select (now() at time zone 'Asia/Jakarta')::date;
$$;

-- Locks the batch so two people cannot move it at once.
create or replace function public.pf_batch_lock(batch uuid)
returns public.pf_batch
language plpgsql
security definer
set search_path = public
as $$
declare
  rec public.pf_batch;
begin
  select * into rec from public.pf_batch where id = batch for update;
  if not found then
    raise exception 'Batch not found';
  end if;
  if rec.status in ('selesai', 'gagal') then
    raise exception 'Batch % is already closed', rec.code;
  end if;
  return rec;
end;
$$;

-- 5. Seed lots ------------------------------------------------------------------
create or replace function public.pf_stock_apply(lot uuid, kind text, delta numeric, batch uuid, why text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  on_hand numeric;
begin
  select qty_on_hand into on_hand from public.pf_stock_lot where id = lot for update;
  if not found then
    raise exception 'Seed lot not found';
  end if;
  if on_hand + delta < 0 then
    raise exception 'Not enough lot stock: % left, % requested', trim_scale(on_hand), trim_scale(-delta);
  end if;
  update public.pf_stock_lot set qty_on_hand = on_hand + delta where id = lot;
  insert into public.pf_stock_move (lot_id, type, qty, batch_id, reason) values (lot, kind, delta, batch, why);
end;
$$;

create or replace function public.pf_seed_lot_add(crop uuid, unit text, lot_no text, qty numeric, received_on date, expiry_on date, supplier text default '', notes text default '')
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  crop_row public.pf_crop;
  item uuid;
  created uuid;
begin
  perform public.pf_require_manager();
  select * into crop_row from public.pf_crop where id = crop;
  if not found then
    raise exception 'Crop not found';
  end if;
  if qty is null or qty <= 0 then
    raise exception 'The seed count must be above 0';
  end if;
  if expiry_on is not null and expiry_on < received_on then
    raise exception 'The expiry date is before the received date';
  end if;
  select id into item from public.pf_item where crop_id = crop and pf_item.unit = pf_seed_lot_add.unit;
  if not found then
    insert into public.pf_item (name, unit, crop_id)
    values (trim('Benih ' || crop_row.name || ' ' || crop_row.variety), pf_seed_lot_add.unit, crop)
    returning id into item;
  end if;
  insert into public.pf_stock_lot (item_id, lot_no, supplier, received_at, expiry_date, notes)
  values (item, trim(pf_seed_lot_add.lot_no), trim(pf_seed_lot_add.supplier), received_on, expiry_on, trim(pf_seed_lot_add.notes))
  returning id into created;
  perform public.pf_stock_apply(created, 'masuk', qty, null, 'Benih diterima');
  return created;
end;
$$;

create or replace function public.pf_seed_lot_adjust(lot uuid, new_qty numeric, why text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  on_hand numeric;
begin
  perform public.pf_require_manager();
  if coalesce(trim(why), '') = '' then
    raise exception 'A reason for the correction is required';
  end if;
  if new_qty is null or new_qty < 0 then
    raise exception 'Quantity cannot be negative';
  end if;
  select qty_on_hand into on_hand from public.pf_stock_lot where id = lot;
  if not found then
    raise exception 'Seed lot not found';
  end if;
  if new_qty <> on_hand then
    perform public.pf_stock_apply(lot, 'koreksi', new_qty - on_hand, null, trim(why));
  end if;
end;
$$;

-- 6. Batch: plan and sow -------------------------------------------------------
create or replace function public.pf_batch_create(recipe uuid, seed_lot uuid, notes text default '')
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  recipe_row public.pf_recipe;
  lot_crop uuid;
  lot_expiry date;
  created uuid;
begin
  perform public.pf_require_manager();
  select * into recipe_row from public.pf_recipe where id = recipe;
  if not found or recipe_row.status <> 'active' then
    raise exception 'A batch must use an active recipe';
  end if;
  select i.crop_id, l.expiry_date into lot_crop, lot_expiry
    from public.pf_stock_lot l join public.pf_item i on i.id = l.item_id where l.id = seed_lot;
  if not found then
    raise exception 'Seed lot not found';
  end if;
  if lot_crop is distinct from recipe_row.crop_id then
    raise exception 'This seed lot is not for this recipe''s crop';
  end if;
  if lot_expiry is not null and lot_expiry < public.pf_today() then
    raise exception 'The seed lot has expired';
  end if;
  insert into public.pf_batch (recipe_id, seed_lot_id, notes)
  values (recipe, seed_lot, trim(pf_batch_create.notes))
  returning id into created;
  insert into public.pf_batch_event (batch_id, type) values (created, 'dibuat');
  return created;
end;
$$;

-- trays: [{"location_id": "...", "seeds": 20}]. seed_used is only for lots kept
-- in grams, where the number of seeds says nothing about the stock taken.
create or replace function public.pf_batch_sow(batch uuid, trays jsonb, sown_on date, seed_used numeric default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  rec public.pf_batch;
  lot_unit text;
  tray jsonb;
  place public.pf_location;
  seeds integer;
  total integer := 0;
begin
  perform public.pf_require_operator();
  rec := public.pf_batch_lock(batch);
  if sown_on is null or sown_on > public.pf_today() then
    raise exception 'The sowing date cannot be in the future';
  end if;
  if rec.sown_at is not null and sown_on < rec.sown_at then
    raise exception 'The sowing date is before this batch''s first sowing (%)', rec.sown_at;
  end if;
  if jsonb_typeof(trays) <> 'array' or jsonb_array_length(trays) = 0 then
    raise exception 'Choose at least one tray position';
  end if;
  for tray in select * from jsonb_array_elements(trays) loop
    seeds := (tray ->> 'seeds')::integer;
    if seeds is null or seeds <= 0 then
      raise exception 'Seeds per tray must be above 0';
    end if;
    select * into place from public.pf_location where id = (tray ->> 'location_id')::uuid for update;
    if not found or place.level <> 'tray_position' then
      raise exception 'Tray position not recognised';
    end if;
    if place.slot_status <> 'available' then
      raise exception 'Position % is not ready to use', place.code;
    end if;
    if exists (select 1 from public.pf_batch_slot where location_id = place.id and removed_at is null) then
      raise exception 'Position % is already filled', place.code;
    end if;
    insert into public.pf_batch_slot (batch_id, location_id, kind, qty, state, placed_at)
    values (batch, place.id, 'tray', seeds, 'disemai', sown_on::timestamp at time zone 'Asia/Jakarta');
    insert into public.pf_batch_event (batch_id, type, qty, location_code) values (batch, 'semai', seeds, place.code);
    total := total + seeds;
  end loop;
  select i.unit into lot_unit
    from public.pf_stock_lot l join public.pf_item i on i.id = l.item_id where l.id = rec.seed_lot_id;
  if lot_unit = 'biji' then
    perform public.pf_stock_apply(rec.seed_lot_id, 'pakai_semai', -total, batch, 'Semai');
  else
    if seed_used is null or seed_used <= 0 then
      raise exception 'Enter the weight of seed used';
    end if;
    perform public.pf_stock_apply(rec.seed_lot_id, 'pakai_semai', -seed_used, batch, 'Semai');
  end if;
  update public.pf_batch
     set status = 'berjalan', sown_at = coalesce(sown_at, sown_on)
   where id = batch;
end;
$$;

-- 7. Trays and holes ------------------------------------------------------------
create or replace function public.pf_tray_update(slot uuid, new_state text, new_germinated integer, new_note text default '')
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  tray public.pf_batch_slot;
  place text;
begin
  perform public.pf_require_operator();
  select * into tray from public.pf_batch_slot where id = slot and kind = 'tray' and removed_at is null for update;
  if not found then
    raise exception 'Tray not found or already empty';
  end if;
  perform public.pf_batch_lock(tray.batch_id);
  if new_state not in ('disemai', 'berkecambah', 'siap_pindah', 'masalah') then
    raise exception 'Invalid tray status';
  end if;
  if new_germinated is null or new_germinated < 0 or new_germinated + tray.moved > tray.qty then
    raise exception 'The germinated count is more than the seeds';
  end if;
  if new_state = 'siap_pindah' and new_germinated = 0 then
    raise exception 'A tray with no sprouts cannot be ready to transplant';
  end if;
  update public.pf_batch_slot set state = new_state, germinated = new_germinated, note = trim(new_note) where id = slot;
  select code into place from public.pf_location where id = tray.location_id;
  insert into public.pf_batch_event (batch_id, type, qty, location_code, note)
  values (tray.batch_id, case when new_state = 'masalah' then 'masalah' else 'germinasi' end, new_germinated, place, trim(new_note));
end;
$$;

-- For a tray that failed or was recorded by mistake. Its seeds stay used; a
-- mistaken record is put right with a stock correction on the lot.
create or replace function public.pf_tray_close(slot uuid, why text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  tray public.pf_batch_slot;
  place text;
begin
  perform public.pf_require_operator();
  if coalesce(trim(why), '') = '' then
    raise exception 'A reason is required';
  end if;
  select * into tray from public.pf_batch_slot where id = slot and kind = 'tray' and removed_at is null for update;
  if not found then
    raise exception 'Tray not found or already empty';
  end if;
  perform public.pf_batch_lock(tray.batch_id);
  update public.pf_batch_slot set removed_at = now() where id = slot;
  select code into place from public.pf_location where id = tray.location_id;
  insert into public.pf_batch_event (batch_id, type, location_code, note) values (tray.batch_id, 'nampan_ditutup', place, trim(why));
end;
$$;

-- Moves a batch's ready seedlings into one tier, as many as fit. A tier grows one
-- batch at a time. What does not fit stays in its tray, still ready for another.
create or replace function public.pf_batch_transplant(batch uuid, tier uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  tier_row public.pf_location;
  free_holes uuid[];
  free_codes text[];
  tray public.pf_batch_slot;
  take integer;
  moved_total integer := 0;
  ready_total integer := 0;
begin
  perform public.pf_require_operator();
  perform public.pf_batch_lock(batch);
  select * into tier_row from public.pf_location where id = tier and level = 'tier' for update;
  if not found then
    raise exception 'Tier not recognised';
  end if;
  if exists (
    select 1 from public.pf_location h
     where h.level = 'hole' and h.code like tier_row.code || '-%' and h.slot_status = 'sanitasi'
  ) then
    raise exception 'Tier % is still in sanitation', tier_row.code;
  end if;
  if exists (
    select 1 from public.pf_batch_slot s
      join public.pf_location h on h.id = s.location_id
     where s.removed_at is null and s.batch_id <> batch and h.code like tier_row.code || '-%'
  ) then
    raise exception 'Tier % is used by another batch', tier_row.code;
  end if;
  select array_agg(id order by code), array_agg(code order by code) into free_holes, free_codes
    from public.pf_location h
   where h.level = 'hole' and h.code like tier_row.code || '-%' and h.slot_status = 'available'
     and not exists (select 1 from public.pf_batch_slot s where s.location_id = h.id and s.removed_at is null);
  if free_holes is null then
    raise exception 'Tier % is full', tier_row.code;
  end if;

  for tray in
    select s.* from public.pf_batch_slot s
      join public.pf_location loc on loc.id = s.location_id
     where s.batch_id = batch and s.kind = 'tray' and s.removed_at is null and s.state = 'siap_pindah' and s.germinated > 0
     order by loc.code
       for update of s
  loop
    ready_total := ready_total + tray.germinated;
    take := least(tray.germinated, coalesce(array_length(free_holes, 1), 0) - moved_total);
    continue when take = 0;
    insert into public.pf_batch_slot (batch_id, location_id, kind, source_slot_id, qty, state)
    select batch, free_holes[moved_total + n], 'hole', tray.id, 1, 'tumbuh' from generate_series(1, take) n;
    moved_total := moved_total + take;
    update public.pf_batch_slot
       set germinated = germinated - take,
           moved = moved + take,
           removed_at = case when germinated = take then now() end
     where id = tray.id;
  end loop;

  if ready_total = 0 then
    raise exception 'This batch has no seedlings ready to transplant yet';
  end if;
  insert into public.pf_batch_event (batch_id, type, qty, location_code) values (batch, 'pindah_tanam', moved_total, tier_row.code);
  return jsonb_build_object('count', moved_total, 'left', ready_total - moved_total, 'first_hole', free_codes[1], 'tier', tier_row.code);
end;
$$;

create or replace function public.pf_hole_update(slot uuid, new_state text, new_note text default '')
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  hole public.pf_batch_slot;
  place text;
begin
  perform public.pf_require_operator();
  select * into hole from public.pf_batch_slot where id = slot and kind = 'hole' and removed_at is null for update;
  if not found then
    raise exception 'No plant found in that hole';
  end if;
  perform public.pf_batch_lock(hole.batch_id);
  if new_state not in ('tumbuh', 'masalah') then
    raise exception 'Invalid hole status';
  end if;
  update public.pf_batch_slot set state = new_state, note = trim(new_note) where id = slot;
  select code into place from public.pf_location where id = hole.location_id;
  insert into public.pf_batch_event (batch_id, type, qty, location_code, note)
  values (hole.batch_id, case when new_state = 'masalah' then 'masalah' else 'pulih' end, 1, place, trim(new_note));
end;
$$;

create or replace function public.pf_hole_close(slot uuid, why text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  hole public.pf_batch_slot;
  place text;
begin
  perform public.pf_require_operator();
  if coalesce(trim(why), '') = '' then
    raise exception 'A reason is required';
  end if;
  select * into hole from public.pf_batch_slot where id = slot and kind = 'hole' and removed_at is null for update;
  if not found then
    raise exception 'No plant found in that hole';
  end if;
  perform public.pf_batch_lock(hole.batch_id);
  update public.pf_batch_slot set removed_at = now() where id = slot;
  select code into place from public.pf_location where id = hole.location_id;
  insert into public.pf_batch_event (batch_id, type, qty, location_code, note) values (hole.batch_id, 'tanaman_dibuang', 1, place, trim(why));
end;
$$;

create or replace function public.pf_batch_note(batch uuid, note text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.pf_require_operator();
  perform public.pf_batch_lock(batch);
  if coalesce(trim(note), '') = '' then
    raise exception 'The note is empty';
  end if;
  insert into public.pf_batch_event (batch_id, type, note) values (batch, 'pengamatan', trim(pf_batch_note.note));
end;
$$;

-- 8. Harvest and closing --------------------------------------------------------
create or replace function public.pf_harvest_add(batch uuid, kg numeric, grade text, harvested_on date, best_before date default null, notes text default '')
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  rec public.pf_batch;
  code text;
begin
  perform public.pf_require_operator();
  rec := public.pf_batch_lock(batch);
  if rec.status <> 'berjalan' then
    raise exception 'The batch is not sown yet';
  end if;
  if not exists (select 1 from public.pf_batch_slot s where s.batch_id = rec.id and s.kind = 'hole' and s.removed_at is null) then
    raise exception 'No plants in the plant factory to harvest yet';
  end if;
  if kg is null or kg <= 0 then
    raise exception 'Harvest weight must be above 0';
  end if;
  if harvested_on is null or harvested_on > public.pf_today() or harvested_on < rec.sown_at then
    raise exception 'The harvest date must be between the sowing date and today';
  end if;
  if best_before is not null and best_before < harvested_on then
    raise exception 'The keep-until date is before the harvest date';
  end if;
  insert into public.pf_harvest_lot (batch_id, harvested_at, fresh_kg, remaining_kg, grade, best_before, notes)
  values (batch, harvested_on, kg, kg, pf_harvest_add.grade, best_before, trim(pf_harvest_add.notes))
  returning lot_code into code;
  insert into public.pf_batch_event (batch_id, type, qty, note) values (batch, 'panen', kg, code || ', grade ' || pf_harvest_add.grade);
  return code;
end;
$$;

create or replace function public.pf_harvest_correct(lot uuid, kg numeric, new_grade text, why text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  old public.pf_harvest_lot;
begin
  perform public.pf_require_manager();
  if coalesce(trim(why), '') = '' then
    raise exception 'A reason for the correction is required';
  end if;
  select * into old from public.pf_harvest_lot where id = lot for update;
  if not found then
    raise exception 'Harvest lot not found';
  end if;
  if kg is null or kg <= 0 or old.remaining_kg + (kg - old.fresh_kg) < 0 then
    raise exception 'The corrected weight is less than what has been used';
  end if;
  update public.pf_harvest_lot
     set fresh_kg = kg, remaining_kg = remaining_kg + (kg - old.fresh_kg), grade = new_grade
   where id = lot;
  insert into public.pf_batch_event (batch_id, type, qty, note)
  values (old.batch_id, 'koreksi_panen', kg, old.lot_code || ', grade ' || new_grade || ': ' || trim(why));
end;
$$;

-- Closes the batch and everything it still occupies. Holes go to sanitation,
-- trays are ready again at once.
create or replace function public.pf_batch_finish(batch uuid, outcome text, why text default '')
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  rec public.pf_batch;
begin
  perform public.pf_require_operator();
  rec := public.pf_batch_lock(batch);
  if outcome not in ('selesai', 'gagal') then
    raise exception 'Invalid batch outcome';
  end if;
  if outcome = 'selesai' and not exists (select 1 from public.pf_harvest_lot where batch_id = batch) then
    raise exception 'Record at least one harvest lot before finishing the batch';
  end if;
  if outcome = 'gagal' and coalesce(trim(why), '') = '' then
    raise exception 'A reason for the failed batch is required';
  end if;
  update public.pf_location
     set slot_status = 'sanitasi'
   where slot_status = 'available'
     and id in (select location_id from public.pf_batch_slot where batch_id = batch and kind = 'hole' and removed_at is null);
  update public.pf_batch_slot set removed_at = now() where batch_id = batch and removed_at is null;
  update public.pf_batch set status = outcome, finished_at = now() where id = batch;
  insert into public.pf_batch_event (batch_id, type, note) values (batch, outcome, trim(why));
end;
$$;

create or replace function public.pf_tier_sanitized(tier uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  tier_code text;
  done integer;
begin
  perform public.pf_require_operator();
  select code into tier_code from public.pf_location where id = tier and level = 'tier';
  if not found then
    raise exception 'Tier not recognised';
  end if;
  update public.pf_location set slot_status = 'available'
   where level = 'hole' and code like tier_code || '-%' and slot_status = 'sanitasi';
  get diagnostics done = row_count;
  if done = 0 then
    raise exception 'Tier % is not in sanitation', tier_code;
  end if;
  return done;
end;
$$;

-- 9. RLS and access -------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['pf_item', 'pf_stock_lot', 'pf_stock_move', 'pf_batch', 'pf_batch_slot', 'pf_batch_event', 'pf_harvest_lot'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_read', t);
    execute format('create policy %I on public.%I for select to authenticated using (public.is_lab_member())', t || '_read', t);
  end loop;
end;
$$;

-- The helpers run only inside the functions above; the rest need a signed-in user.
do $$
declare
  fn text;
begin
  foreach fn in array array[
    'pf_batch_lock(uuid)',
    'pf_stock_apply(uuid, text, numeric, uuid, text)'
  ] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', fn);
  end loop;
  foreach fn in array array[
    'pf_can_operate()',
    'pf_require_operator()',
    'pf_require_manager()',
    'pf_seed_lot_add(uuid, text, text, numeric, date, date, text, text)',
    'pf_seed_lot_adjust(uuid, numeric, text)',
    'pf_batch_create(uuid, uuid, text)',
    'pf_batch_sow(uuid, jsonb, date, numeric)',
    'pf_tray_update(uuid, text, integer, text)',
    'pf_tray_close(uuid, text)',
    'pf_batch_transplant(uuid, uuid)',
    'pf_hole_update(uuid, text, text)',
    'pf_hole_close(uuid, text)',
    'pf_batch_note(uuid, text)',
    'pf_harvest_add(uuid, numeric, text, date, date, text)',
    'pf_harvest_correct(uuid, numeric, text, text)',
    'pf_batch_finish(uuid, text, text)',
    'pf_tier_sanitized(uuid)'
  ] loop
    execute format('revoke all on function public.%s from public, anon', fn);
    execute format('grant execute on function public.%s to authenticated', fn);
  end loop;
end;
$$;

-- 10. Audit: slots and events are their own history, so they are left out.
do $$
declare
  audited text;
begin
  foreach audited in array array['pf_item', 'pf_stock_lot', 'pf_batch', 'pf_harvest_lot'] loop
    execute format('drop trigger if exists pf_audit on public.%I', audited);
    execute format(
      'create trigger pf_audit after insert or update or delete on public.%I for each row execute function public.pf_audit()',
      audited
    );
  end loop;
end;
$$;

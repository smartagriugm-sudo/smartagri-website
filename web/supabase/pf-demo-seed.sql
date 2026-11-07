-- Dummy data for the whole ERP, so every screen can be seen filled. NOT real data.
-- Run manually in the Supabase SQL editor, after every other pf-*.sql, as one script.
-- Remove it with pf-demo-clean.sql. All dates are relative to the day it is run.
--
-- Every row it makes has an id starting d0000000, or hangs off a row that does, and
-- names and codes carry a D or DMO, so the clean-up finds exactly these rows and no
-- real ones. It stops without changing anything if it has already run, or if a hole
-- or tray position it wants is taken.

begin;
set local statement_timeout = 0;

create or replace function pg_temp.d(domain integer, n bigint) returns uuid language sql immutable as $$
  select ('d0000000-0000-4000-8000-' || lpad(domain::text, 4, '0') || lpad(n::text, 8, '0'))::uuid
$$;
create or replace function pg_temp.loc(wanted text) returns uuid language sql stable as $$
  select id from public.pf_location where code = wanted
$$;
create or replace function pg_temp.at_wib(day date, clock text) returns timestamptz language sql immutable as $$
  select (day::text || ' ' || clock)::timestamp at time zone 'Asia/Jakarta'
$$;
create or replace function pg_temp.today() returns date language sql stable as $$
  select (now() at time zone 'Asia/Jakarta')::date
$$;
create temporary sequence if not exists pg_temp_slot_seq;
select setval('pg_temp_slot_seq', 1);

/* --------------------------------------------------------------- batch helpers */

create or replace function pg_temp.ev(batch uuid, kind text, day date, qty numeric, place text, what text) returns void language sql as $$
  insert into public.pf_batch_event (batch_id, type, at, qty, location_code, note)
  values (batch, kind, pg_temp.at_wib(day, '09:00'), qty, place, coalesce(what, ''))
$$;

create or replace function pg_temp.sow(idx integer, recipe integer, lot integer, sown date, seeds integer, what text) returns uuid language plpgsql as $$
declare
  b uuid := pg_temp.d(7, idx);
begin
  insert into public.pf_batch (id, code, recipe_id, seed_lot_id, status, sown_at, notes)
  values (b, 'B-D' || lpad(idx::text, 2, '0'), pg_temp.d(2, recipe), pg_temp.d(5, lot), 'berjalan', sown, coalesce(what, ''));
  perform public.pf_stock_apply(pg_temp.d(5, lot), 'pakai_semai', -seeds, b, 'Sowing B-D' || lpad(idx::text, 2, '0'));
  perform pg_temp.ev(b, 'dibuat', sown, null, null, null);
  perform pg_temp.ev(b, 'semai', sown, seeds, null, null);
  return b;
end;
$$;

/** Open trays at the chamber's positions. */
create or replace function pg_temp.trays(b uuid, codes text[], kind text, per_tray integer, sprouted integer, day date) returns void language plpgsql as $$
declare
  c text;
begin
  foreach c in array codes loop
    insert into public.pf_batch_slot (id, batch_id, location_id, kind, qty, germinated, state, placed_at)
    values (pg_temp.d(8, nextval('pg_temp_slot_seq')), b, pg_temp.loc(c), 'tray', per_tray, sprouted, kind, pg_temp.at_wib(day, '08:00'));
  end loop;
end;
$$;

/** Moves a batch into a tier: its trays, already closed, and one row per plant in the holes. */
create or replace function pg_temp.plant(b uuid, rack integer, tier integer, plants integer, tray_codes text[], sown date, moved date, per_tray integer) returns void language plpgsql as $$
declare
  tier_code text := 'R' || rack || '-T' || tier;
  left_over integer := plants;
  tray uuid;
  taken integer;
  c text;
  hole record;
  done integer := 0;
  ids uuid[] := '{}';
begin
  foreach c in array tray_codes loop
    taken := least(per_tray, left_over);
    tray := pg_temp.d(8, nextval('pg_temp_slot_seq'));
    insert into public.pf_batch_slot (id, batch_id, location_id, kind, qty, germinated, moved, state, placed_at, removed_at)
    values (tray, b, pg_temp.loc(c), 'tray', per_tray, per_tray - taken, taken, 'siap_pindah', pg_temp.at_wib(sown, '08:00'), pg_temp.at_wib(moved, '08:30'));
    ids := ids || tray;
    left_over := left_over - taken;
  end loop;
  for hole in
    select id, row_number() over (order by code) as n from public.pf_location
     where level = 'hole' and code like tier_code || '-%' order by code limit plants
  loop
    insert into public.pf_batch_slot (id, batch_id, location_id, kind, source_slot_id, qty, state, placed_at)
    values (pg_temp.d(8, nextval('pg_temp_slot_seq')), b, hole.id, 'hole', ids[1 + ((hole.n - 1) / per_tray)::integer % array_length(ids, 1)], 1, 'tumbuh', pg_temp.at_wib(moved, '09:00'));
    done := done + 1;
  end loop;
  perform pg_temp.ev(b, 'germinasi', sown + 3, plants, null, null);
  perform pg_temp.ev(b, 'pindah_tanam', moved, done, tier_code, null);
end;
$$;

create or replace function pg_temp.harvest(idx integer, b uuid, day date, kg numeric, remaining numeric, grade text, keeps integer) returns void language plpgsql as $$
begin
  insert into public.pf_harvest_lot (id, lot_code, batch_id, harvested_at, fresh_kg, remaining_kg, grade, best_before)
  values (pg_temp.d(9, idx), 'H-D' || lpad(idx::text, 2, '0'), b, day, kg, remaining, grade, day + keeps);
  perform pg_temp.ev(b, 'panen', day, kg, null, 'Lot H-D' || lpad(idx::text, 2, '0'));
end;
$$;

create or replace function pg_temp.finish(b uuid, day date, final_status text, what text) returns void language plpgsql as $$
begin
  update public.pf_batch_slot set removed_at = pg_temp.at_wib(day, '15:00') where batch_id = b and removed_at is null;
  update public.pf_batch set status = final_status, finished_at = pg_temp.at_wib(day, '15:00') where id = b;
  perform pg_temp.ev(b, 'selesai', day, null, null, what);
end;
$$;

/* --------------------------------------------------------------- sensor curves */

/** One reading: a day's swing, a slower drift, a little deterministic noise, and the pH excursion. */
create or replace function pg_temp.curve(place text, metric text, ts timestamptz) returns numeric language plpgsql stable as $$
declare
  hours numeric := extract(epoch from ts) / 3600;
  clock numeric := extract(hour from ts at time zone 'Asia/Jakarta') + extract(minute from ts at time zone 'Asia/Jakarta') / 60;
  day_swing numeric := sin(2 * pi() * (hours + 7 - 8) / 24);
  drift numeric := sin(2 * pi() * hours / (24 * 9));
  noise numeric := (abs(hashtext(place || metric || ts::text)) % 2000) / 1000.0 - 1;
  lamp_on boolean := clock >= 6 and clock < 22;
  t numeric;
  h numeric;
begin
  if metric = 'vpd' then
    t := pg_temp.curve(place, 'suhu', ts);
    h := pg_temp.curve(place, 'rh', ts);
    return round(0.6108 * exp((17.27 * t) / (t + 237.3)) * (1 - h / 100), 3);
  end if;
  if place = 'CH1' then
    return case metric
      when 'suhu' then round(23.8 + 0.7 * day_swing + 0.3 * drift + 0.08 * noise, 2)
      when 'rh' then round(73 - 2.2 * day_swing + 1.0 * drift + 0.5 * noise, 1)
      when 'co2' then round(790 - 35 * day_swing + 25 * drift + 6 * noise, 0)
      when 'cahaya' then case when lamp_on then round(12000 + 300 * drift + 120 * noise, 0) else 0 end
    end;
  end if;
  return case metric
    when 'suhu' then round(22.4 + 1.5 * day_swing + 0.5 * drift + 0.1 * noise, 2)
    when 'rh' then round(68 - 4.5 * day_swing + 2 * drift + 0.6 * noise, 1)
    when 'co2' then round(820 - 70 * day_swing + 40 * drift + 8 * noise, 0)
    when 'cahaya' then case when lamp_on then round(14500 + 400 * drift + 150 * noise, 0) else 0 end
    when 'ph' then round(6.05 + 0.1 * drift + 0.015 * noise + greatest(0, 0.45 - extract(epoch from now() - ts) / 3600 * 0.06), 3)
    when 'ec' then round(1.72 - 0.28 * ((hours % 168) / 168) + 0.015 * noise, 3)
    when 'do' then round(7.8 - 0.45 * day_swing + 0.2 * drift + 0.04 * noise, 2)
    when 'suhu_larutan' then round(21.6 + 0.7 * day_swing + 0.3 * drift + 0.05 * noise, 2)
  end;
end;
$$;

/* -------------------------------------------------------------------- the data */

do $seed$
declare
  today date := pg_temp.today();
  month_start date := date_trunc('month', pg_temp.today())::date;
  b1 uuid; b2 uuid; b3 uuid; b4 uuid; b5 uuid; b6 uuid; b7 uuid; b8 uuid; b9 uuid; b10 uuid; b12 uuid;
  r record;
  day date;
  n integer;
  p integer;
begin
  if exists (select 1 from public.pf_crop where id = pg_temp.d(1, 1)) then
    raise exception 'The dummy data is already there. Run pf-demo-clean.sql first to fill it again.';
  end if;
  if exists (
    select 1 from public.pf_batch_slot s join public.pf_location l on l.id = s.location_id
     where s.removed_at is null and (l.code like 'R1-T%' or l.code like 'R2-T%' or l.code like 'CH1-S%')
  ) then
    raise exception 'Some holes or trays are in use by another batch. The dummy data was not added.';
  end if;

  /* Crops and recipes. */
  insert into public.pf_crop (id, name, variety, cycle_days, germ_rate, notes) values
    (pg_temp.d(1, 1), 'Lettuce', 'Romaine Rex', 35, 92, 'Data dummy'),
    (pg_temp.d(1, 2), 'Lettuce', 'Butterhead Bibb', 35, 90, 'Data dummy'),
    (pg_temp.d(1, 3), 'Pakcoy', 'Nauli F1', 30, 95, 'Data dummy'),
    (pg_temp.d(1, 4), 'Water spinach', 'Bangkok LP-1', 25, 88, 'Data dummy');

  insert into public.pf_recipe (id, crop_id, code, notes) values
    (pg_temp.d(2, 1), pg_temp.d(1, 1), 'DMO-ROM', 'Data dummy'),
    (pg_temp.d(2, 2), pg_temp.d(1, 2), 'DMO-BUT', 'Data dummy'),
    (pg_temp.d(2, 3), pg_temp.d(1, 3), 'DMO-PAK', 'Data dummy'),
    (pg_temp.d(2, 4), pg_temp.d(1, 4), 'DMO-KAN', 'Data dummy');

  insert into public.pf_recipe_phase (recipe_id, phase, seq, duration_days, photoperiod_h, ppfd_umol)
  select pg_temp.d(2, v.recipe), v.phase, v.seq, v.days, v.photo, v.ppfd from (values
    (1, 'germinasi', 1, 3, 0.0, 0.0), (1, 'bibit', 2, 11, 16.0, 150.0), (1, 'vegetatif', 3, 18, 16.0, 250.0), (1, 'pra_panen', 4, 3, 14.0, 220.0),
    (2, 'germinasi', 1, 3, 0.0, 0.0), (2, 'bibit', 2, 11, 16.0, 150.0), (2, 'vegetatif', 3, 18, 16.0, 240.0), (2, 'pra_panen', 4, 3, 14.0, 220.0),
    (3, 'germinasi', 1, 3, 0.0, 0.0), (3, 'bibit', 2, 9, 16.0, 160.0), (3, 'vegetatif', 3, 15, 16.0, 260.0), (3, 'pra_panen', 4, 3, 14.0, 230.0),
    (4, 'germinasi', 1, 2, 0.0, 0.0), (4, 'bibit', 2, 8, 16.0, 160.0), (4, 'vegetatif', 3, 13, 16.0, 270.0), (4, 'pra_panen', 4, 2, 14.0, 240.0)
  ) as v(recipe, phase, seq, days, photo, ppfd);

  /* What each phase of each recipe aims for. */
  insert into public.pf_recipe_target (recipe_id, phase, metric, low, target, high)
  select pg_temp.d(2, x.recipe), f.phase, t.metric, t.low, t.target, t.high
    from generate_series(1, 4) as x(recipe)
    cross join (values ('germinasi'), ('bibit'), ('vegetatif'), ('pra_panen')) as f(phase)
    cross join (values
      ('suhu', 20.0, 22.5, 25.0), ('rh', 60.0, 68.0, 76.0), ('vpd', 0.5, 0.9, 1.3), ('co2', 700.0, 850.0, 1000.0),
      ('ph', 5.8, 6.1, 6.4), ('ec', 1.2, 1.5, 1.8), ('do', 6.5, 7.5, 9.0), ('suhu_larutan', 19.0, 21.5, 24.0)
    ) as t(metric, low, target, high);

  /* Items. */
  insert into public.pf_item (id, sku, name, category, unit, crop_id, reorder_point, track_expiry, notes) values
    (pg_temp.d(4, 1), 'DMO-BNH-1', 'Romaine lettuce seed', 'benih', 'biji', pg_temp.d(1, 1), 300, true, 'Data dummy'),
    (pg_temp.d(4, 2), 'DMO-BNH-2', 'Butterhead lettuce seed', 'benih', 'biji', pg_temp.d(1, 2), 300, true, 'Data dummy'),
    (pg_temp.d(4, 3), 'DMO-BNH-3', 'Pakcoy seed', 'benih', 'biji', pg_temp.d(1, 3), 300, true, 'Data dummy'),
    (pg_temp.d(4, 4), 'DMO-BNH-4', 'Water spinach seed', 'benih', 'biji', pg_temp.d(1, 4), 300, true, 'Data dummy'),
    (pg_temp.d(4, 5), 'DMO-NUT-A', 'AB mix nutrient A', 'nutrisi', 'liter', null, 20, true, 'Data dummy'),
    (pg_temp.d(4, 6), 'DMO-NUT-B', 'AB mix nutrient B', 'nutrisi', 'liter', null, 20, true, 'Data dummy'),
    (pg_temp.d(4, 7), 'DMO-MED-1', 'Rockwool cube 2.5 cm', 'media', 'pcs', null, 500, false, 'Data dummy'),
    (pg_temp.d(4, 8), 'DMO-MED-2', 'Netpot 5 cm', 'media', 'pcs', null, 200, false, 'Data dummy'),
    (pg_temp.d(4, 9), 'DMO-KMS-1', 'Clamshell pack 250 g', 'kemasan', 'pcs', null, 300, false, 'Data dummy'),
    (pg_temp.d(4, 10), 'DMO-SKC-1', 'Silicone hose 8 mm', 'suku_cadang', 'meter', null, 10, false, 'Data dummy');

  /* Suppliers and customers. */
  insert into public.pf_partner (id, name, kind, contact_name, phone, email, address, tax_id, notes) values
    (pg_temp.d(6, 1), 'Dummy Resto Hijau Kaliurang', 'pelanggan', 'Rina Pratiwi', '0812-0000-1001', 'rina@contoh.test', 'Jl. Kaliurang km 7, Sleman', '', 'Data dummy'),
    (pg_temp.d(6, 2), 'Dummy Pasar Segar Yogyakarta', 'pelanggan', 'Bagus Santoso', '0812-0000-1002', 'bagus@contoh.test', 'Jl. Magelang km 4, Sleman', '01.234.567.8-542.000', 'Data dummy'),
    (pg_temp.d(6, 3), 'Dummy Katering Sehat Nusantara', 'pelanggan', 'Dewi Lestari', '0812-0000-1003', 'dewi@contoh.test', 'Jl. Godean km 3, Sleman', '', 'Data dummy'),
    (pg_temp.d(6, 4), 'Dummy Toko Sayur Depok', 'pelanggan', 'Agus Wijaya', '0812-0000-1004', 'agus@contoh.test', 'Depok, Sleman', '', 'Data dummy'),
    (pg_temp.d(6, 5), 'Dummy Benih Unggul Lembang', 'pemasok', 'Sinta Maharani', '0812-0000-2001', 'sinta@contoh.test', 'Lembang, Bandung Barat', '02.345.678.9-421.000', 'Data dummy'),
    (pg_temp.d(6, 6), 'Dummy Hidroponik Supply Jogja', 'pemasok', 'Yoga Prasetyo', '0812-0000-2002', 'yoga@contoh.test', 'Bantul, Yogyakarta', '', 'Data dummy'),
    (pg_temp.d(6, 7), 'Dummy Kemasan Prima', 'keduanya', 'Lina Kusuma', '0812-0000-2003', 'lina@contoh.test', 'Klaten, Jawa Tengah', '', 'Data dummy');

  insert into public.pf_tax_rate (id, name, percent, valid_from) values (pg_temp.d(17, 1), 'PPN 11% (dummy)', 11, today - 400);

  /* Purchases: one received, one late, one still a draft. */
  insert into public.pf_purchase_order (id, po_no, supplier_id, ordered_on, expected_on, status, notes) values
    (pg_temp.d(18, 1), 'PO-DMO-001', pg_temp.d(6, 6), today - 80, today - 72, 'dipesan', 'Data dummy'),
    (pg_temp.d(18, 2), 'PO-DMO-002', pg_temp.d(6, 7), today - 12, today - 3, 'dipesan', 'Data dummy'),
    (pg_temp.d(18, 3), 'PO-DMO-003', pg_temp.d(6, 5), today - 1, today + 10, 'draf', 'Data dummy');
  insert into public.pf_po_line (id, po_id, item_id, qty, unit_price, received_qty) values
    (pg_temp.d(19, 1), pg_temp.d(18, 1), pg_temp.d(4, 5), 40, 65000, 40),
    (pg_temp.d(19, 2), pg_temp.d(18, 1), pg_temp.d(4, 6), 40, 65000, 40),
    (pg_temp.d(19, 3), pg_temp.d(18, 1), pg_temp.d(4, 7), 3000, 450, 3000),
    (pg_temp.d(19, 4), pg_temp.d(18, 1), pg_temp.d(4, 8), 800, 900, 800),
    (pg_temp.d(19, 5), pg_temp.d(18, 2), pg_temp.d(4, 9), 1000, 1800, 0),
    (pg_temp.d(19, 6), pg_temp.d(18, 3), pg_temp.d(4, 1), 2000, 120, 0);

  /* Lots, entered through the same ledger the app uses. */
  for r in select * from (values
    (1, 1, 'DMO-ROM-2606', 'Dummy Benih Unggul Lembang', 5000, today - 100, today + 240, null::integer, 95::numeric),
    (2, 2, 'DMO-BUT-2606', 'Dummy Benih Unggul Lembang', 4000, today - 100, today + 240, null, 110),
    (3, 3, 'DMO-PAK-2607', 'Dummy Benih Unggul Lembang', 4000, today - 90, today + 9, null, 60),
    (4, 4, 'DMO-KAN-2607', 'Dummy Benih Unggul Lembang', 3000, today - 90, today + 300, null, 40),
    (5, 5, 'DMO-AB-A-01', 'Dummy Hidroponik Supply Jogja', 40, today - 72, today + 280, 1, null),
    (6, 6, 'DMO-AB-B-01', 'Dummy Hidroponik Supply Jogja', 40, today - 72, today + 280, 2, null),
    (7, 7, 'DMO-RW-01', 'Dummy Hidroponik Supply Jogja', 3000, today - 72, null, 3, null),
    (8, 8, 'DMO-NP-01', 'Dummy Hidroponik Supply Jogja', 800, today - 72, null, 4, null),
    (9, 9, 'DMO-KMS-01', 'Dummy Kemasan Prima', 150, today - 60, null, null, 1750),
    (10, 10, 'DMO-SLG-01', 'Dummy Hidroponik Supply Jogja', 25, today - 60, null, null, 12000)
  ) as v(idx, item, lot_no, supplier, qty, received, expiry, po_line, price) loop
    insert into public.pf_stock_lot (id, item_id, lot_no, supplier, qty_on_hand, received_at, expiry_date, notes, po_line_id)
    values (pg_temp.d(5, r.idx), pg_temp.d(4, r.item), r.lot_no, r.supplier, 0, r.received, r.expiry, 'Data dummy', case when r.po_line is null then null else pg_temp.d(19, r.po_line) end);
    perform public.pf_stock_apply(pg_temp.d(5, r.idx), 'masuk', r.qty, null, 'Data dummy');
    if r.price is not null then
      insert into public.pf_lot_price (id, lot_id, unit_cost, note) values (pg_temp.d(37, r.idx), pg_temp.d(5, r.idx), r.price, 'Data dummy');
    end if;
  end loop;

  /* What a recipe uses per seed, per plant and per kg. Fires as batches are recorded below. */
  insert into public.pf_recipe_material (id, recipe_id, item_id, basis, qty)
  select pg_temp.d(39, (x.recipe - 1) * 10 + m.n), pg_temp.d(2, x.recipe), pg_temp.d(4, m.item), m.basis, m.qty
    from generate_series(1, 4) as x(recipe)
    cross join (values (1, 7, 'per_benih', 1.0), (2, 8, 'per_tanaman', 1.0), (3, 5, 'per_tanaman', 0.02), (4, 6, 'per_tanaman', 0.02), (5, 9, 'per_kg_panen', 4.0)) as m(n, item, basis, qty);

  update public.pf_recipe set status = 'active', activated_at = now() - interval '90 days' where id in (pg_temp.d(2, 1), pg_temp.d(2, 2), pg_temp.d(2, 3), pg_temp.d(2, 4));

  /* Finished batches, for history, harvest lots and sales. */
  b1 := pg_temp.sow(1, 1, 1, today - 72, 120, 'Data dummy');
  perform pg_temp.plant(b1, 1, 1, 80, array['CH1-S1-P01', 'CH1-S1-P02', 'CH1-S1-P03', 'CH1-S1-P04', 'CH1-S1-P05'], today - 72, today - 58, 24);
  perform pg_temp.harvest(1, b1, today - 37, 19.4, 0, 'A', 7);
  perform pg_temp.harvest(2, b1, today - 37, 5.2, 0, 'B', 5);
  perform pg_temp.finish(b1, today - 36, 'selesai', 'Harvest done');

  b2 := pg_temp.sow(2, 3, 3, today - 55, 96, 'Data dummy');
  perform pg_temp.plant(b2, 1, 2, 80, array['CH1-S2-P01', 'CH1-S2-P02', 'CH1-S2-P03', 'CH1-S2-P04'], today - 55, today - 43, 24);
  perform pg_temp.harvest(3, b2, today - 25, 16.8, 0, 'A', 6);
  perform pg_temp.finish(b2, today - 24, 'selesai', 'Harvest done');

  b3 := pg_temp.sow(3, 2, 2, today - 44, 48, 'Dummy data, lost to fungus during germination');
  perform pg_temp.trays(b3, array['CH1-S3-P01', 'CH1-S3-P02'], 'masalah', 24, 3, today - 44);
  perform pg_temp.ev(b3, 'masalah', today - 39, null, 'CH1-S3-P01', 'Fungus on the media');
  perform pg_temp.finish(b3, today - 37, 'gagal', 'Discarded, tray sanitised');

  b12 := pg_temp.sow(12, 2, 2, today - 40, 96, 'Data dummy');
  perform pg_temp.plant(b12, 2, 3, 80, array['CH1-S3-P03', 'CH1-S3-P04', 'CH1-S3-P05', 'CH1-S3-P06'], today - 40, today - 26, 24);
  perform pg_temp.harvest(4, b12, today - 5, 21.5, 11.5, 'A', 6);
  perform pg_temp.harvest(5, b12, today - 5, 4.1, 4.1, 'B', 5);
  perform pg_temp.finish(b12, today - 4, 'selesai', 'Harvest done');

  /* In the plant factory now. */
  b4 := pg_temp.sow(4, 1, 1, today - 33, 96, 'Data dummy');
  perform pg_temp.plant(b4, 1, 1, 78, array['CH1-S1-P01', 'CH1-S1-P02', 'CH1-S1-P03', 'CH1-S1-P04'], today - 33, today - 19, 24);
  update public.pf_batch_slot set state = 'masalah', note = 'Yellowing leaves, being watched'
   where batch_id = b4 and kind = 'hole' and location_id in (pg_temp.loc('R1-T1-G3-H16'), pg_temp.loc('R1-T1-G4-H06'));
  perform pg_temp.ev(b4, 'masalah', today - 2, 2, 'R1-T1', 'Yellowing leaves in two holes');

  b5 := pg_temp.sow(5, 2, 2, today - 22, 96, 'Data dummy');
  perform pg_temp.plant(b5, 1, 2, 77, array['CH1-S2-P01', 'CH1-S2-P02', 'CH1-S2-P03', 'CH1-S2-P04'], today - 22, today - 8, 24);
  perform pg_temp.ev(b5, 'pengamatan', today - 3, null, 'R1-T2', 'Even growth, 11 cm tall');

  b6 := pg_temp.sow(6, 3, 3, today - 17, 96, 'Data dummy');
  perform pg_temp.plant(b6, 1, 3, 75, array['CH1-S3-P01', 'CH1-S3-P02', 'CH1-S3-P03', 'CH1-S3-P04'], today - 17, today - 5, 24);

  b7 := pg_temp.sow(7, 4, 4, today - 28, 48, 'Data dummy');
  perform pg_temp.plant(b7, 2, 2, 40, array['CH1-S4-P01', 'CH1-S4-P02'], today - 28, today - 18, 24);

  /* In the chamber now. */
  b8 := pg_temp.sow(8, 3, 3, today - 12, 96, 'Data dummy');
  perform pg_temp.trays(b8, array['CH1-S1-P01', 'CH1-S1-P02', 'CH1-S1-P03', 'CH1-S1-P04'], 'siap_pindah', 24, 22, today - 12);
  perform pg_temp.ev(b8, 'germinasi', today - 9, 88, null, null);

  b9 := pg_temp.sow(9, 1, 1, today - 6, 144, 'Data dummy');
  perform pg_temp.trays(b9, array['CH1-S2-P01', 'CH1-S2-P02', 'CH1-S2-P03', 'CH1-S2-P04', 'CH1-S2-P05'], 'berkecambah', 24, 21, today - 6);
  perform pg_temp.trays(b9, array['CH1-S2-P06'], 'masalah', 24, 12, today - 6);
  perform pg_temp.ev(b9, 'germinasi', today - 3, 117, null, null);
  update public.pf_batch_slot set note = 'Uneven sprouting' where batch_id = b9 and location_id = pg_temp.loc('CH1-S2-P06');

  b10 := pg_temp.sow(10, 2, 2, today - 2, 96, 'Data dummy');
  perform pg_temp.trays(b10, array['CH1-S3-P01', 'CH1-S3-P02', 'CH1-S3-P03', 'CH1-S3-P04'], 'disemai', 24, 0, today - 2);

  /* Waiting to be sown. */
  insert into public.pf_batch (id, code, recipe_id, seed_lot_id, status, notes) values (pg_temp.d(7, 11), 'B-D11', pg_temp.d(2, 4), pg_temp.d(5, 4), 'direncanakan', 'Data dummy');
  perform pg_temp.ev(pg_temp.d(7, 11), 'dibuat', today, null, null, null);

  /* One tier being cleaned. */
  update public.pf_location set slot_status = 'sanitasi' where level = 'hole' and code like 'R2-T1-%' and slot_status = 'available';

  /* Sales: paid, part paid and overdue, confirmed but late, a draft, a cancelled one. */
  insert into public.pf_sales_order (id, so_no, partner_id, ordered_on, requested_on, status, notes, cancel_note) values
    (pg_temp.d(10, 1), 'SO-DMO-001', pg_temp.d(6, 1), today - 40, today - 36, 'dikonfirmasi', 'Data dummy', ''),
    (pg_temp.d(10, 2), 'SO-DMO-002', pg_temp.d(6, 2), today - 28, today - 25, 'dikonfirmasi', 'Data dummy', ''),
    (pg_temp.d(10, 3), 'SO-DMO-003', pg_temp.d(6, 3), today - 6, today - 2, 'dikonfirmasi', 'Data dummy', ''),
    (pg_temp.d(10, 4), 'SO-DMO-004', pg_temp.d(6, 4), today - 1, today + 4, 'draf', 'Data dummy', ''),
    (pg_temp.d(10, 5), 'SO-DMO-005', pg_temp.d(6, 4), today - 18, today - 15, 'batal', 'Data dummy', 'Customer cancelled');
  insert into public.pf_so_line (id, sales_order_id, crop_id, grade, qty_kg, price_per_kg) values
    (pg_temp.d(11, 1), pg_temp.d(10, 1), pg_temp.d(1, 1), 'A', 19.4, 48000),
    (pg_temp.d(11, 2), pg_temp.d(10, 1), pg_temp.d(1, 1), 'B', 5.2, 30000),
    (pg_temp.d(11, 3), pg_temp.d(10, 2), pg_temp.d(1, 3), 'A', 16.8, 32000),
    (pg_temp.d(11, 4), pg_temp.d(10, 3), pg_temp.d(1, 2), 'A', 10, 52000),
    (pg_temp.d(11, 5), pg_temp.d(10, 4), pg_temp.d(1, 2), 'A', 8, 52000),
    (pg_temp.d(11, 6), pg_temp.d(10, 5), pg_temp.d(1, 3), 'A', 6, 32000);
  insert into public.pf_delivery (id, delivery_no, sales_order_id, delivered_on, recipient, notes) values
    (pg_temp.d(12, 1), 'SJ-DMO-001', pg_temp.d(10, 1), today - 36, 'Rina Pratiwi', 'Data dummy'),
    (pg_temp.d(12, 2), 'SJ-DMO-002', pg_temp.d(10, 2), today - 25, 'Bagus Santoso', 'Data dummy');
  insert into public.pf_so_allocation (id, so_line_id, harvest_lot_id, qty_kg, delivery_id) values
    (pg_temp.d(13, 1), pg_temp.d(11, 1), pg_temp.d(9, 1), 19.4, pg_temp.d(12, 1)),
    (pg_temp.d(13, 2), pg_temp.d(11, 2), pg_temp.d(9, 2), 5.2, pg_temp.d(12, 1)),
    (pg_temp.d(13, 3), pg_temp.d(11, 3), pg_temp.d(9, 3), 16.8, pg_temp.d(12, 2)),
    (pg_temp.d(13, 4), pg_temp.d(11, 4), pg_temp.d(9, 4), 10, null);
  insert into public.pf_invoice (id, invoice_no, sales_order_id, issued_on, due_on, subtotal, tax_rate_id, tax_name, tax_percent, tax_amount, total, notes) values
    (pg_temp.d(14, 1), 'INV-DMO-001', pg_temp.d(10, 1), today - 35, today - 21, 1087200, null, '', 0, 0, 1087200, 'Data dummy'),
    (pg_temp.d(14, 2), 'INV-DMO-002', pg_temp.d(10, 2), today - 24, today - 10, 537600, pg_temp.d(17, 1), 'PPN 11% (dummy)', 11, 59136, 596736, 'Data dummy');
  insert into public.pf_invoice_line (id, invoice_id, so_line_id, description, qty_kg, price_per_kg, amount) values
    (pg_temp.d(15, 1), pg_temp.d(14, 1), pg_temp.d(11, 1), 'Romaine Rex lettuce, grade A', 19.4, 48000, 931200),
    (pg_temp.d(15, 2), pg_temp.d(14, 1), pg_temp.d(11, 2), 'Romaine Rex lettuce, grade B', 5.2, 30000, 156000),
    (pg_temp.d(15, 3), pg_temp.d(14, 2), pg_temp.d(11, 3), 'Pakcoy Nauli F1, grade A', 16.8, 32000, 537600);
  insert into public.pf_payment (id, invoice_id, paid_on, amount, method, reference) values
    (pg_temp.d(16, 1), pg_temp.d(14, 1), today - 22, 1087200, 'transfer', 'DMY-TRF-0001'),
    (pg_temp.d(16, 2), pg_temp.d(14, 2), today - 15, 300000, 'tunai', 'DMY-KWT-0002');

  /* People. */
  insert into public.pf_work_area (id, name, lat, lng, radius_m) values (pg_temp.d(22, 1), 'Dummy Area SARC', -7.765000, 110.372000, 150);
  insert into public.pf_person (id, full_name, person_type, phone, joined_on) values
    (pg_temp.d(20, 1), 'Dummy Hendra Saputra', 'karyawan', '0812-0000-3001', today - 500),
    (pg_temp.d(20, 2), 'Dummy Sari Wulandari', 'karyawan', '0812-0000-3002', today - 320),
    (pg_temp.d(20, 3), 'Dummy Fajar Nugroho', 'peneliti', '0812-0000-3003', today - 260),
    (pg_temp.d(20, 4), 'Dummy Nisa Rahmawati', 'mahasiswa', '0812-0000-3004', today - 120),
    (pg_temp.d(20, 5), 'Dummy Rudi Hartono', 'harian', '0812-0000-3005', today - 90),
    (pg_temp.d(20, 6), 'Dummy Maya Anggraini', 'magang', '0812-0000-3006', today - 45);
  update public.pf_person set supervisor_id = pg_temp.d(20, 1) where id in (pg_temp.d(20, 2), pg_temp.d(20, 4), pg_temp.d(20, 5), pg_temp.d(20, 6));
  insert into public.pf_contract (id, person_id, type, position, start_date, end_date, rate_idr, rate_basis, notes) values
    (pg_temp.d(21, 1), pg_temp.d(20, 1), 'tetap', 'Production coordinator', today - 500, null, 5200000, 'bulan', 'Data dummy'),
    (pg_temp.d(21, 2), pg_temp.d(20, 2), 'kontrak', 'Operator', today - 320, today + 20, 3400000, 'bulan', 'Data dummy'),
    (pg_temp.d(21, 3), pg_temp.d(20, 3), 'lainnya', 'Researcher', today - 260, today + 200, 4000000, 'bulan', 'Data dummy'),
    (pg_temp.d(21, 4), pg_temp.d(20, 4), 'magang', 'Research assistant', today - 120, today + 60, 1000000, 'bulan', 'Data dummy'),
    (pg_temp.d(21, 5), pg_temp.d(20, 5), 'harian', 'Harvest worker', today - 90, null, 120000, 'hari', 'Data dummy'),
    (pg_temp.d(21, 6), pg_temp.d(20, 6), 'magang', 'Operations intern', today - 45, today + 45, 800000, 'bulan', 'Data dummy');
  insert into public.pf_labor_rate (id, person_type, valid_from, hourly_idr) values
    (pg_temp.d(27, 1), 'karyawan', today - 600, 30000),
    (pg_temp.d(27, 2), 'peneliti', today - 600, 40000),
    (pg_temp.d(27, 3), 'mahasiswa', today - 600, 15000),
    (pg_temp.d(27, 4), 'magang', today - 600, 12000),
    (pg_temp.d(27, 5), 'harian', today - 600, 18000);
  insert into public.pf_attendance_consent (person_id) select id from public.pf_person where id::text like 'd0000000-%';

  /* Two weeks back and forward. Nobody works Sundays. Nisa is on approved leave; Maya has not shown up today. */
  insert into public.pf_leave (id, person_id, type, start_date, end_date, reason, status, decided_at, decide_note) values
    (pg_temp.d(24, 1), pg_temp.d(20, 4), 'izin', today - 1, today + 1, 'Thesis seminar', 'disetujui', now() - interval '3 days', 'Approved'),
    (pg_temp.d(24, 2), pg_temp.d(20, 2), 'cuti', today + 6, today + 8, 'Family event', 'diajukan', null, ''),
    (pg_temp.d(24, 3), pg_temp.d(20, 5), 'sakit', today - 9, today - 8, 'Fever', 'disetujui', now() - interval '9 days', '');
  n := 0;
  for day in select generate_series(today - 14, today + 14, interval '1 day')::date loop
    continue when extract(dow from day) = 0;
    for p in 1..6 loop
      n := n + 1;
      insert into public.pf_shift (id, person_id, work_date, start_at, end_at, area_id)
      values (pg_temp.d(23, n), pg_temp.d(20, p), day, case when p = 3 then time '09:00' else time '07:00' end, case when p = 3 then time '16:00' else time '15:00' end, pg_temp.d(22, 1));
      if day < today or (day = today and p not in (6)) then
        continue when p = 4 and day between today - 1 and today + 1;
        continue when p = 5 and day between today - 9 and today - 8;
        insert into public.pf_attendance (id, person_id, shift_id, clock_in, clock_out, in_lat, in_lng, in_accuracy_m, in_within_area, out_lat, out_lng, out_accuracy_m, out_within_area, missed_out, source, note)
        values (
          pg_temp.d(25, n), pg_temp.d(20, p), pg_temp.d(23, n),
          least(pg_temp.at_wib(day, case when p = 3 then '08:56' else '06:5' || (n % 9) end), now() - interval '10 minutes'),
          case when day = today or (p = 5 and day = today - 3) then null else pg_temp.at_wib(day, case when p = 3 then '16:04' else '15:0' || (n % 9) end) end,
          -7.765100, 110.372100, 12,
          case when (p = 2 and day = today) or (p = 6 and day = today - 2) then false else true end,
          case when day = today or (p = 5 and day = today - 3) then null else -7.765100 end,
          case when day = today or (p = 5 and day = today - 3) then null else 110.372100 end,
          case when day = today or (p = 5 and day = today - 3) then null else 15 end,
          case when day = today or (p = 5 and day = today - 3) then null else true end,
          p = 5 and day = today - 3,
          case when p = 1 and day = today - 4 then 'manual' else 'ponsel' end,
          case when p = 1 and day = today - 4 then 'Phone left behind, recorded by the coordinator' else '' end
        );
      end if;
    end loop;
  end loop;

  /* Hours worked on batches, for the labor cost of each. */
  n := 0;
  for r in select * from (values
    (b1, today - 72), (b1, today - 58), (b1, today - 37), (b2, today - 55), (b2, today - 43), (b2, today - 25),
    (b12, today - 40), (b12, today - 26), (b12, today - 5), (b4, today - 33), (b4, today - 19), (b4, today - 2),
    (b5, today - 22), (b5, today - 8), (b6, today - 17), (b6, today - 5), (b7, today - 28), (b7, today - 18),
    (b8, today - 12), (b9, today - 6), (b10, today - 2)
  ) as v(batch, worked) loop
    n := n + 1;
    insert into public.pf_labor_log (id, person_id, batch_id, work_date, minutes, activity)
    values (pg_temp.d(26, n), pg_temp.d(20, 1 + n % 3), r.batch, r.worked, 60 + (n * 37) % 240, (array['Sowing', 'Transplant', 'Maintenance', 'Harvest and pack'])[1 + n % 4]);
  end loop;

  /* Stock taken by hand. */
  insert into public.pf_stock_count (id, counted_on, notes, lots, changed) values (pg_temp.d(35, 1), today - 10, 'Data dummy', 2, 1);
  insert into public.pf_stock_count_line (id, count_id, lot_id, system, counted)
  select pg_temp.d(36, v.n), pg_temp.d(35, 1), pg_temp.d(5, v.lot), l.qty_on_hand, l.qty_on_hand + v.diff
    from (values (1, 10, -2.0), (2, 7, 0.0)) as v(n, lot, diff)
    join public.pf_stock_lot l on l.id = pg_temp.d(5, v.lot);
  perform public.pf_stock_apply(pg_temp.d(5, 10), 'opname', -2, null, 'Dummy stock count');
  perform public.pf_stock_apply(pg_temp.d(5, 10), 'pakai_lain', -3, null, 'Replace the hose on rack 2');

  /* Running costs: two months of each bill, per room, and two bills on one batch. */
  n := 0;
  for r in select * from (values ('listrik', 'Electricity', 2850000::numeric, 620000::numeric), ('air', 'Air', 240000, 90000), ('sewa', 'Room rent', 1500000, 400000), ('penyusutan', 'Rack and lamp depreciation', 950000, 350000)) as v(category, label, pf, ch) loop
    for p in 0..1 loop
      n := n + 2;
      insert into public.pf_cost_entry (id, category, description, amount, area, period_start, period_end) values
        (pg_temp.d(28, n), r.category, r.label || ' plant factory (dummy)', r.pf, 'plant_factory', (month_start - make_interval(months => p + 1))::date, (month_start - make_interval(months => p) - interval '1 day')::date),
        (pg_temp.d(28, n + 1), r.category, r.label || ' seedling chamber (dummy)', r.ch, 'persemaian', (month_start - make_interval(months => p + 1))::date, (month_start - make_interval(months => p) - interval '1 day')::date);
    end loop;
  end loop;
  insert into public.pf_cost_entry (id, category, description, amount, batch_id, period_start, period_end) values
    (pg_temp.d(28, 100), 'bahan_lain', 'Biological fungicide (dummy)', 85000, b1, today - 50, today - 50),
    (pg_temp.d(28, 101), 'tenaga_lain', 'Harvest contract (dummy)', 150000, b12, today - 5, today - 5);

  /* Devices: online, one that went quiet, one in maintenance. */
  insert into public.pf_asset (id, code, name, kind, model, serial, location_id, metrics, interval_s, status, notes) values
    (pg_temp.d(31, 1), 'DMO-IK-01', 'Grow room climate sensor', 'iklim', 'Dummy SHT-CO2', 'DM-0001', pg_temp.loc('PF01'), array['suhu', 'rh', 'vpd', 'co2'], 300, 'aktif', 'Data dummy'),
    (pg_temp.d(31, 2), 'DMO-NT-01', 'Tank solution sensor', 'nutrisi', 'Dummy AquaProbe', 'DM-0002', pg_temp.loc('PF01'), array['ph', 'ec', 'do', 'suhu_larutan'], 300, 'aktif', 'Data dummy'),
    (pg_temp.d(31, 3), 'DMO-IK-02', 'Seedling chamber microclimate sensor', 'iklim', 'Dummy SHT-CO2', 'DM-0003', pg_temp.loc('CH1'), array['suhu', 'rh', 'vpd', 'co2', 'cahaya'], 300, 'aktif', 'Data dummy'),
    (pg_temp.d(31, 4), 'DMO-LX-01', 'Rack 2 light sensor', 'iklim', 'Dummy Lux-200', 'DM-0004', pg_temp.loc('PF01'), array['cahaya'], 300, 'aktif', 'Dummy data, stopped sending'),
    (pg_temp.d(31, 5), 'DMO-IK-03', 'Spare climate sensor', 'iklim', 'Dummy SHT-CO2', 'DM-0005', pg_temp.loc('PF01'), array['suhu'], 300, 'perawatan', 'Dummy data, being recalibrated');

  insert into public.pf_calibration (id, asset_id, metric, calibrated_at, offset_value, slope, next_due, notes) values
    (pg_temp.d(34, 1), pg_temp.d(31, 1), 'suhu', now() - interval '60 days', 0.1, 1, today + 120, 'Data dummy'),
    (pg_temp.d(34, 2), pg_temp.d(31, 2), 'ph', now() - interval '100 days', -0.02, 1.01, today - 5, 'Data dummy'),
    (pg_temp.d(34, 3), pg_temp.d(31, 2), 'ec', now() - interval '40 days', 0, 1, today + 50, 'Data dummy'),
    (pg_temp.d(34, 4), pg_temp.d(31, 3), 'suhu', now() - interval '30 days', 0.05, 1, today + 150, 'Data dummy');
end;
$seed$;

/* Readings: five-minute steps for three days, hourly summaries for ninety. */
select public.pf_reading_ensure_partition((date_trunc('month', now()) - make_interval(months => m))::date) from generate_series(0, 1) as m;

insert into public.pf_sensor_reading (asset_id, location_id, metric, ts, value, raw)
select a.id, a.location_id, x.metric, t.ts, v.value, v.value
  from public.pf_asset a
  join public.pf_location l on l.id = a.location_id
  cross join lateral unnest(a.metrics) as x(metric)
  cross join lateral generate_series(
    date_bin('5 minutes', now() - interval '72 hours', timestamptz '2000-01-01'),
    now() - case when a.code = 'DMO-LX-01' then interval '5 hours' else interval '1 minute' end,
    interval '5 minutes'
  ) as t(ts)
  cross join lateral (select pg_temp.curve(l.code, x.metric, t.ts) as value) v
 where a.code in ('DMO-IK-01', 'DMO-NT-01', 'DMO-IK-02', 'DMO-LX-01');

insert into public.pf_reading_latest (asset_id, metric, location_id, ts, value)
select distinct on (r.asset_id, r.metric) r.asset_id, r.metric, r.location_id, r.ts, r.value
  from public.pf_sensor_reading r
 where r.asset_id::text like 'd0000000-%'
 order by r.asset_id, r.metric, r.ts desc;

update public.pf_asset a set last_seen_at = (select max(ts) from public.pf_reading_latest l where l.asset_id = a.id)
 where a.code in ('DMO-IK-01', 'DMO-NT-01', 'DMO-IK-02', 'DMO-LX-01');

insert into public.pf_reading_hourly (location_id, metric, hour, n, sum_value, min_value, max_value)
select a.location_id, x.metric, t.hour, 12, v.value * 12, v.value * 0.985, v.value * 1.015
  from public.pf_asset a
  join public.pf_location l on l.id = a.location_id
  cross join lateral unnest(a.metrics) as x(metric)
  cross join lateral generate_series(date_trunc('hour', now()) - interval '90 days', date_trunc('hour', now()), interval '1 hour') as t(hour)
  cross join lateral (select pg_temp.curve(l.code, x.metric, t.hour) as value) v
 where a.code in ('DMO-IK-01', 'DMO-NT-01', 'DMO-IK-02')
on conflict (location_id, metric, hour) do nothing;

/* Alarms: one open and unhandled, one handled, one past. */
insert into public.pf_alarm_rule (id, location_id, metric, warn_low, warn_high, crit_low, crit_high, delay_s) values
  (pg_temp.d(32, 1), pg_temp.loc('PF01'), 'ph', 5.8, 6.4, 5.5, 6.8, 300),
  (pg_temp.d(32, 2), pg_temp.loc('PF01'), 'suhu', 18, 26, 15, 30, 600),
  (pg_temp.d(32, 3), pg_temp.loc('PF01'), 'ec', 1.2, 1.9, 0.9, 2.2, 600),
  (pg_temp.d(32, 4), pg_temp.loc('CH1'), 'suhu', 20, 27, 18, 30, 600);
insert into public.pf_alarm (id, rule_id, asset_id, metric, level, value, opened_at, ack_at, closed_at) values
  (pg_temp.d(33, 1), pg_temp.d(32, 1), pg_temp.d(31, 2), 'ph', 'peringatan', 6.46, now() - interval '50 minutes', null, null),
  (pg_temp.d(33, 2), pg_temp.d(32, 4), pg_temp.d(31, 3), 'suhu', 'peringatan', 27.4, now() - interval '3 hours', now() - interval '2 hours', null),
  (pg_temp.d(33, 3), pg_temp.d(32, 3), pg_temp.d(31, 2), 'ec', 'kritis', 0.86, now() - interval '12 days', now() - interval '12 days', now() - interval '11 days'),
  (pg_temp.d(33, 4), pg_temp.d(32, 2), pg_temp.d(31, 1), 'suhu', 'peringatan', 26.6, now() - interval '20 days', now() - interval '20 days', now() - interval '20 days');

/* Maintenance: one overdue plan with an open order, one due later, one past repair with a cost. */
insert into public.pf_maintenance_plan (id, title, asset_id, every_days, last_done, notes) values
  (pg_temp.d(29, 1), 'Calibrate the pH and EC probes', pg_temp.d(31, 2), 30, pg_temp.today() - 38, 'Data dummy'),
  (pg_temp.d(29, 2), 'Clean the main pump filter', null, 14, pg_temp.today() - 16, 'Data dummy'),
  (pg_temp.d(29, 3), 'Check the seedling chamber LED panels', pg_temp.d(31, 3), 90, pg_temp.today() - 20, 'Data dummy');
insert into public.pf_cost_entry (id, category, description, amount, area, period_start, period_end) values
  (pg_temp.d(28, 102), 'perawatan', 'Replace the pump on rack 1 (dummy)', 450000, 'plant_factory', pg_temp.today() - 18, pg_temp.today() - 18);
insert into public.pf_work_order (id, wo_no, plan_id, asset_id, title, kind, due_on, status, done_on, done_note, cost_idr, cost_entry_id) values
  (pg_temp.d(30, 1), 'WO-DMO-001', pg_temp.d(29, 1), pg_temp.d(31, 2), 'Calibrate the pH and EC probes', 'terjadwal', pg_temp.today() - 8, 'terbuka', null, '', 0, null),
  (pg_temp.d(30, 2), 'WO-DMO-002', null, null, 'Replace the pump on rack 1', 'perbaikan', pg_temp.today() - 18, 'selesai', pg_temp.today() - 18, 'The old pump leaked, replaced', 450000, pg_temp.d(28, 102));

commit;

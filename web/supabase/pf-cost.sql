-- ERP costs: what a batch cost, per kg, what is spent keeping the place running, and
-- device maintenance. Design: docs/erp-plant-factory/RENCANA-ERP-PLANT-FACTORY.md. Run
-- manually in the Supabase SQL editor after pf-hr.sql (it needs inventory, sales and
-- people). Safe to run again.
--
-- A batch's cost is four things, each traceable to its rows so it can be checked by hand:
--   Bahan     what stock moves say it used, at the price of the lot's purchase line, or
--             the price entered for a lot that came without one.
--   Tenaga    hours in pf_labor_log at a standard hourly rate per kind of person. Not the
--             contract's pay: contracts are closed to the people who read costs, and a
--             batch worked by one person would give their pay away.
--   Langsung  bills entered against this batch.
--   Bersama   a room's bill for a period, shared by how many tray-days or hole-days each
--             batch took in that room in that period. All of it lands on batches that
--             were there, so an empty room makes the batches around it look expensive.
--
-- Something without a price is counted and reported, never treated as free.
--
-- Prices and rates are for the production manager, ERP admins and leadership. Technicians
-- run maintenance. Every write goes through a function below.

-- 1. Roles ---------------------------------------------------------------------

create or replace function public.pf_can_read_cost()
returns boolean language sql stable security definer set search_path = public
as $$ select public.pf_can_manage_production() or public.pf_has_role(array['pimpinan']); $$;

create or replace function public.pf_can_read_maintenance()
returns boolean language sql stable security definer set search_path = public
as $$ select public.pf_can_maintain() or public.pf_can_read_cost(); $$;

-- 2. Tables --------------------------------------------------------------------

-- For a lot that did not come through a purchase order. pf_stock_lot is readable by
-- every lab member, so the price lives apart from it.
create table if not exists public.pf_lot_price (
  id         uuid primary key default gen_random_uuid(),
  lot_id     uuid not null unique references public.pf_stock_lot (id) on delete cascade,
  unit_cost  numeric(14, 2) not null check (unit_cost >= 0),
  note       text not null default '',
  by_id      uuid default auth.uid() references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);

-- Dated, so changing a rate does not change what a finished batch cost.
create table if not exists public.pf_labor_rate (
  id          uuid primary key default gen_random_uuid(),
  person_type text not null check (person_type in ('karyawan', 'peneliti', 'mahasiswa', 'magang', 'harian')),
  valid_from  date not null,
  hourly_idr  numeric(12, 2) not null check (hourly_idr >= 0),
  by_id       uuid default auth.uid() references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  unique (person_type, valid_from)
);

-- Either against one batch, or for a room over a period.
create table if not exists public.pf_cost_entry (
  id           uuid primary key default gen_random_uuid(),
  category     text not null check (category in ('listrik', 'air', 'sewa', 'penyusutan', 'perawatan', 'bahan_lain', 'tenaga_lain', 'lainnya')),
  description  text not null default '',
  amount       numeric(14, 2) not null check (amount > 0),
  batch_id     uuid references public.pf_batch (id) on delete restrict,
  area         text check (area in ('persemaian', 'plant_factory')),
  period_start date not null,
  period_end   date not null,
  voided_at    timestamptz,
  void_note    text not null default '',
  by_id        uuid default auth.uid() references auth.users (id) on delete set null,
  created_at   timestamptz not null default now(),
  check (period_end >= period_start),
  check ((batch_id is not null and area is null) or (batch_id is null and area is not null))
);
create index if not exists pf_cost_entry_batch_idx on public.pf_cost_entry (batch_id);
create index if not exists pf_cost_entry_period_idx on public.pf_cost_entry (period_start, period_end);

create table if not exists public.pf_maintenance_plan (
  id         uuid primary key default gen_random_uuid(),
  title      text not null check (trim(title) <> ''),
  asset_id   uuid references public.pf_asset (id) on delete set null,
  every_days integer not null check (every_days > 0),
  last_done  date,
  notes      text not null default '',
  active     boolean not null default true,
  by_id      uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.pf_work_order (
  id            uuid primary key default gen_random_uuid(),
  wo_no         text not null unique,
  plan_id       uuid references public.pf_maintenance_plan (id) on delete set null,
  asset_id      uuid references public.pf_asset (id) on delete set null,
  title         text not null check (trim(title) <> ''),
  kind          text not null check (kind in ('terjadwal', 'perbaikan')),
  due_on        date not null,
  status        text not null default 'terbuka' check (status in ('terbuka', 'selesai', 'batal')),
  done_on       date,
  done_note     text not null default '',
  cost_idr      numeric(14, 2) not null default 0 check (cost_idr >= 0),
  cost_entry_id uuid references public.pf_cost_entry (id) on delete set null,
  by_id         uuid default auth.uid() references auth.users (id) on delete set null,
  created_at    timestamptz not null default now()
);
create index if not exists pf_work_order_plan_idx on public.pf_work_order (plan_id);
-- One open order per plan, so opening the page twice does not double the work.
create unique index if not exists pf_work_order_one_open on public.pf_work_order (plan_id) where status = 'terbuka' and plan_id is not null;

do $$
declare
  t text;
begin
  foreach t in array array['pf_lot_price', 'pf_labor_rate', 'pf_cost_entry'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_read', t);
    execute format('create policy %I on public.%I for select to authenticated using (public.pf_can_read_cost())', t || '_read', t);
    execute format('revoke insert, update, delete, truncate on public.%I from public, anon, authenticated', t);
  end loop;
  foreach t in array array['pf_maintenance_plan', 'pf_work_order'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_read', t);
    execute format('create policy %I on public.%I for select to authenticated using (public.pf_can_read_maintenance())', t || '_read', t);
    execute format('revoke insert, update, delete, truncate on public.%I from public, anon, authenticated', t);
  end loop;
  foreach t in array array['pf_lot_price', 'pf_labor_rate', 'pf_cost_entry', 'pf_maintenance_plan', 'pf_work_order'] loop
    execute format('drop trigger if exists pf_audit on public.%I', t);
    execute format('create trigger pf_audit after insert or update or delete on public.%I for each row execute function public.pf_audit()', t);
  end loop;
end;
$$;

-- 3. Views ---------------------------------------------------------------------

create or replace view public.pf_maintenance_plan_overview with (security_invoker = true) as
select
  p.id, p.title, p.asset_id, p.every_days, p.last_done, p.notes, p.active,
  a.code as asset_code, a.name as asset_name,
  coalesce(p.last_done + p.every_days, public.pf_today()) as next_due,
  w.id as open_order_id
from public.pf_maintenance_plan p
left join public.pf_asset a on a.id = p.asset_id
left join public.pf_work_order w on w.plan_id = p.id and w.status = 'terbuka';

create or replace view public.pf_work_order_overview with (security_invoker = true) as
select
  w.id, w.wo_no, w.plan_id, w.asset_id, w.title, w.kind, w.due_on, w.status, w.done_on, w.done_note, w.cost_idr, w.created_at,
  a.code as asset_code, a.name as asset_name
from public.pf_work_order w
left join public.pf_asset a on a.id = w.asset_id;

revoke all on public.pf_maintenance_plan_overview, public.pf_work_order_overview from anon;
grant select on public.pf_maintenance_plan_overview, public.pf_work_order_overview to authenticated;

-- 4. The arithmetic. Not callable from outside: the read functions below check the role. --

-- Occupancy in slot-days within a period, for one batch or (null) for all of them. The day
-- a slot is emptied does not count, so moving a tray never counts one day twice.
create or replace function public.pf_slot_days(target uuid, wanted_kind text, from_day date, to_day date)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(greatest(0,
    least(coalesce((s.removed_at at time zone 'Asia/Jakarta')::date, public.pf_today() + 1), to_day + 1)
    - greatest((s.placed_at at time zone 'Asia/Jakarta')::date, from_day)
  )), 0)::bigint
  from public.pf_batch_slot s
  where s.kind = wanted_kind and (target is null or s.batch_id = target);
$$;

create or replace function public.pf_cost_kind(room text)
returns text language sql immutable
as $$ select case room when 'persemaian' then 'tray' else 'hole' end; $$;

create or replace function public.pf_cost_materials(target uuid)
returns table (item_name text, unit text, lot_id uuid, lot_no text, qty numeric, unit_cost numeric, from_po boolean, amount numeric)
language sql
stable
security definer
set search_path = public
as $$
  select
    i.name, i.unit, l.id, l.lot_no, -sum(m.qty),
    coalesce(pl.unit_price, lp.unit_cost),
    pl.id is not null,
    round(-sum(m.qty) * coalesce(pl.unit_price, lp.unit_cost), 2)
  from public.pf_stock_move m
  join public.pf_stock_lot l on l.id = m.lot_id
  join public.pf_item i on i.id = l.item_id
  left join public.pf_po_line pl on pl.id = l.po_line_id
  left join public.pf_lot_price lp on lp.lot_id = l.id
  where m.batch_id = target
  group by i.name, i.unit, l.id, l.lot_no, pl.id, pl.unit_price, lp.unit_cost
  having sum(m.qty) < 0
  order by i.name, l.lot_no;
$$;

create or replace function public.pf_cost_labor(target uuid)
returns table (person_type text, minutes bigint, hourly_idr numeric, amount numeric)
language sql
stable
security definer
set search_path = public
as $$
  select p.person_type, sum(l.minutes)::bigint, r.hourly_idr, round(sum(l.minutes) * r.hourly_idr / 60, 2)
  from public.pf_labor_log l
  join public.pf_person p on p.id = l.person_id
  left join lateral (
    select x.hourly_idr from public.pf_labor_rate x
     where x.person_type = p.person_type and x.valid_from <= l.work_date
     order by x.valid_from desc limit 1
  ) r on true
  where l.batch_id = target
  group by p.person_type, r.hourly_idr
  order by p.person_type, r.hourly_idr;
$$;

create or replace function public.pf_cost_shared(target uuid)
returns table (entry_id uuid, category text, description text, area text, period_start date, period_end date, total numeric, batch_days bigint, all_days bigint, amount numeric)
language sql
stable
security definer
set search_path = public
as $$
  select e.id, e.category, e.description, e.area, e.period_start, e.period_end, e.amount, d.mine, d.everyone,
    round(e.amount * d.mine / d.everyone, 2)
  from public.pf_cost_entry e
  cross join lateral (
    select
      public.pf_slot_days(target, public.pf_cost_kind(e.area), e.period_start, e.period_end) as mine,
      public.pf_slot_days(null, public.pf_cost_kind(e.area), e.period_start, e.period_end) as everyone
  ) d
  where e.batch_id is null and e.voided_at is null and d.mine > 0
  order by e.period_start desc, e.category;
$$;

revoke all on function public.pf_slot_days(uuid, text, date, date) from public, anon, authenticated;
revoke all on function public.pf_cost_kind(text) from public, anon, authenticated;
revoke all on function public.pf_cost_materials(uuid) from public, anon, authenticated;
revoke all on function public.pf_cost_labor(uuid) from public, anon, authenticated;
revoke all on function public.pf_cost_shared(uuid) from public, anon, authenticated;

-- 5. Reading -------------------------------------------------------------------

-- Every batch that has started, with its parts. Totals and per-kg come from these on the page.
create or replace function public.pf_batch_costs()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.pf_require(public.pf_can_read_cost());
  return coalesce((
    select jsonb_agg(to_jsonb(x) order by x.sown_at desc nulls last, x.code desc)
    from (
      select
        o.id, o.code, o.status, o.crop_name, o.crop_variety, o.sown_at, o.finished_at, o.harvested_kg,
        coalesce(h.sellable_kg, 0) as sellable_kg,
        coalesce(m.material, 0) as material,
        coalesce(m.unpriced_lots, 0) as unpriced_lots,
        coalesce(l.labor, 0) as labor,
        coalesce(l.minutes, 0) as minutes,
        coalesce(l.unrated_minutes, 0) as unrated_minutes,
        coalesce(d.direct, 0) as direct,
        coalesce(s.shared, 0) as shared,
        coalesce(r.revenue, 0) as revenue,
        coalesce(r.sold_kg, 0) as sold_kg
      from public.pf_batch_overview o
      left join lateral (select sum(fresh_kg) filter (where grade <> 'Afkir') as sellable_kg from public.pf_harvest_lot where batch_id = o.id) h on true
      left join lateral (select sum(c.amount) as material, count(*) filter (where c.unit_cost is null) as unpriced_lots from public.pf_cost_materials(o.id) c) m on true
      left join lateral (select sum(c.amount) as labor, sum(c.minutes) as minutes, sum(c.minutes) filter (where c.hourly_idr is null) as unrated_minutes from public.pf_cost_labor(o.id) c) l on true
      left join lateral (select sum(e.amount) as direct from public.pf_cost_entry e where e.batch_id = o.id and e.voided_at is null) d on true
      left join lateral (select sum(c.amount) as shared from public.pf_cost_shared(o.id) c) s on true
      left join lateral (
        select sum(a.qty_kg * sl.price_per_kg) as revenue, sum(a.qty_kg) as sold_kg
        from public.pf_so_allocation a
        join public.pf_harvest_lot hl on hl.id = a.harvest_lot_id
        join public.pf_so_line sl on sl.id = a.so_line_id
        where hl.batch_id = o.id and a.delivery_id is not null
      ) r on true
      where o.status <> 'direncanakan'
    ) x
  ), '[]'::jsonb);
end;
$$;

-- Every line behind one batch's figure, so it can be redone by hand.
create or replace function public.pf_batch_cost_detail(target uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.pf_require(public.pf_can_read_cost());
  return jsonb_build_object(
    'materials', coalesce((select jsonb_agg(to_jsonb(c)) from public.pf_cost_materials(target) c), '[]'::jsonb),
    'labor', coalesce((select jsonb_agg(to_jsonb(c)) from public.pf_cost_labor(target) c), '[]'::jsonb),
    'direct', coalesce((
      select jsonb_agg(jsonb_build_object('id', e.id, 'category', e.category, 'description', e.description, 'amount', e.amount, 'spent_on', e.period_start) order by e.period_start desc)
      from public.pf_cost_entry e where e.batch_id = target and e.voided_at is null
    ), '[]'::jsonb),
    'shared', coalesce((select jsonb_agg(to_jsonb(c)) from public.pf_cost_shared(target) c), '[]'::jsonb)
  );
end;
$$;

create or replace function public.pf_cost_entries()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.pf_require(public.pf_can_read_cost());
  return coalesce((
    select jsonb_agg(to_jsonb(x) order by x.period_start desc, x.created_at desc)
    from (
      select e.id, e.category, e.description, e.amount, e.batch_id, e.area, e.period_start, e.period_end, e.voided_at, e.void_note, e.created_at,
        b.code as batch_code,
        case when e.area is null then null else public.pf_slot_days(null, public.pf_cost_kind(e.area), e.period_start, e.period_end) end as all_days
      from public.pf_cost_entry e
      left join public.pf_batch b on b.id = e.batch_id
      order by e.period_start desc, e.created_at desc
      limit 300
    ) x
  ), '[]'::jsonb);
end;
$$;

-- Lots and their price, for filling in the ones that came without a purchase order.
create or replace function public.pf_cost_lots()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.pf_require(public.pf_can_read_cost());
  return coalesce((
    select jsonb_agg(to_jsonb(x) order by x.unit_cost nulls first, x.item_name, x.lot_no)
    from (
      select l.id, l.lot_no, l.received_at, i.name as item_name, i.unit,
        coalesce(pl.unit_price, lp.unit_cost) as unit_cost,
        pl.id is not null as from_po,
        coalesce((select -sum(m.qty) from public.pf_stock_move m where m.lot_id = l.id and m.batch_id is not null), 0) as used_in_batches
      from public.pf_stock_lot l
      join public.pf_item i on i.id = l.item_id
      left join public.pf_po_line pl on pl.id = l.po_line_id
      left join public.pf_lot_price lp on lp.lot_id = l.id
    ) x
  ), '[]'::jsonb);
end;
$$;

-- Money by month and by kind. A bill counts in the month its period starts.
create or replace function public.pf_cost_monthly(months integer default 12)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  since date := (date_trunc('month', public.pf_today()) - make_interval(months => least(greatest(months, 1), 36) - 1))::date;
begin
  perform public.pf_require(public.pf_can_read_cost());
  return coalesce((
    select jsonb_agg(jsonb_build_object('month', x.month, 'category', x.category, 'amount', x.amount) order by x.month desc, x.category)
    from (
      select y.month, y.category, sum(y.amount) as amount
      from (
        select date_trunc('month', m.at at time zone 'Asia/Jakarta')::date as month, 'bahan' as category,
          round(-m.qty * coalesce(pl.unit_price, lp.unit_cost), 2) as amount
        from public.pf_stock_move m
        join public.pf_stock_lot l on l.id = m.lot_id
        left join public.pf_po_line pl on pl.id = l.po_line_id
        left join public.pf_lot_price lp on lp.lot_id = l.id
        where m.type like 'pakai%' and (m.at at time zone 'Asia/Jakarta')::date >= since
        union all
        select date_trunc('month', g.work_date)::date, 'tenaga', round(g.minutes * r.hourly_idr / 60, 2)
        from public.pf_labor_log g
        join public.pf_person p on p.id = g.person_id
        left join lateral (
          select z.hourly_idr from public.pf_labor_rate z
           where z.person_type = p.person_type and z.valid_from <= g.work_date
           order by z.valid_from desc limit 1
        ) r on true
        where g.work_date >= since
        union all
        select date_trunc('month', e.period_start)::date, e.category, e.amount
        from public.pf_cost_entry e
        where e.voided_at is null and e.period_start >= since
        union all
        select date_trunc('month', i.issued_on)::date, 'pendapatan', i.subtotal
        from public.pf_invoice i
        where i.status = 'terbit' and i.issued_on >= since
      ) y
      where y.amount is not null
      group by y.month, y.category
    ) x
  ), '[]'::jsonb);
end;
$$;

-- 6. Writing costs -------------------------------------------------------------

create or replace function public.pf_lot_price_set(lot uuid, price numeric, new_note text default '')
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  line uuid;
begin
  perform public.pf_require(public.pf_can_manage_production());
  select po_line_id into line from public.pf_stock_lot where id = lot;
  if not found then
    raise exception 'Lot tidak ditemukan';
  end if;
  if line is not null then
    raise exception 'Harga lot ini mengikuti pesanan pembeliannya';
  end if;
  if price is null or price < 0 then
    raise exception 'Harga tidak boleh negatif';
  end if;
  insert into public.pf_lot_price (lot_id, unit_cost, note) values (lot, price, coalesce(trim(new_note), ''))
  on conflict (lot_id) do update set unit_cost = excluded.unit_cost, note = excluded.note, by_id = auth.uid(), updated_at = now();
end;
$$;

create or replace function public.pf_labor_rate_set(new_type text, starts date, hourly numeric)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.pf_require(public.pf_can_manage_production());
  if starts is null then
    raise exception 'Tanggal berlaku wajib diisi';
  end if;
  if hourly is null or hourly < 0 then
    raise exception 'Tarif tidak boleh negatif';
  end if;
  insert into public.pf_labor_rate (person_type, valid_from, hourly_idr) values (new_type, starts, hourly)
  on conflict (person_type, valid_from) do update set hourly_idr = excluded.hourly_idr, by_id = auth.uid();
end;
$$;

create or replace function public.pf_cost_entry_add(new_category text, what text, new_amount numeric, batch uuid, new_area text, starts date, ends date)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  saved uuid;
begin
  perform public.pf_require(public.pf_can_manage_production());
  if batch is null and new_area is null then
    raise exception 'Pilih batch atau ruang';
  end if;
  if batch is not null and new_area is not null then
    raise exception 'Pilih batch atau ruang, tidak keduanya';
  end if;
  if starts is null or ends is null or ends < starts then
    raise exception 'Periode tidak valid';
  end if;
  if new_amount is null or new_amount <= 0 then
    raise exception 'Jumlah harus lebih dari nol';
  end if;
  insert into public.pf_cost_entry (category, description, amount, batch_id, area, period_start, period_end)
  values (new_category, coalesce(trim(what), ''), new_amount, batch, new_area, starts, ends)
  returning id into saved;
  return saved;
end;
$$;

-- Money records are voided with a reason, not deleted.
create or replace function public.pf_cost_entry_void(entry uuid, why text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.pf_require(public.pf_can_manage_production());
  if coalesce(trim(why), '') = '' then
    raise exception 'Alasan wajib diisi';
  end if;
  update public.pf_cost_entry set voided_at = now(), void_note = trim(why) where id = entry and voided_at is null;
  if not found then
    raise exception 'Catatan tidak ditemukan atau sudah dibatalkan';
  end if;
end;
$$;

-- 7. Maintenance ----------------------------------------------------------------

create or replace function public.pf_plan_save(target uuid, new_title text, asset uuid, every integer, last_day date, new_notes text, is_active boolean default true)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  saved uuid := target;
begin
  perform public.pf_require(public.pf_can_maintain());
  if coalesce(trim(new_title), '') = '' then
    raise exception 'Nama pekerjaan wajib diisi';
  end if;
  if every is null or every < 1 then
    raise exception 'Jarak perawatan minimal 1 hari';
  end if;
  if target is null then
    insert into public.pf_maintenance_plan (title, asset_id, every_days, last_done, notes, active)
    values (trim(new_title), asset, every, last_day, coalesce(trim(new_notes), ''), is_active)
    returning id into saved;
  else
    update public.pf_maintenance_plan
       set title = trim(new_title), asset_id = asset, every_days = every, last_done = last_day, notes = coalesce(trim(new_notes), ''), active = is_active
     where id = target;
    if not found then
      raise exception 'Rencana tidak ditemukan';
    end if;
  end if;
  return saved;
end;
$$;

create or replace function public.pf_wo_create(plan uuid, asset uuid, new_title text, due date)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  the_plan public.pf_maintenance_plan;
  saved uuid;
begin
  perform public.pf_require(public.pf_can_maintain());
  if plan is not null then
    select * into the_plan from public.pf_maintenance_plan p where p.id = plan for update;
    if not found then
      raise exception 'Rencana tidak ditemukan';
    end if;
    if exists (select 1 from public.pf_work_order w where w.plan_id = plan and w.status = 'terbuka') then
      raise exception 'Rencana ini sudah punya perintah kerja yang terbuka';
    end if;
  elsif coalesce(trim(new_title), '') = '' then
    raise exception 'Nama pekerjaan wajib diisi';
  end if;
  insert into public.pf_work_order (wo_no, plan_id, asset_id, title, kind, due_on)
  values (
    public.pf_next_doc_no('WO', public.pf_today()),
    plan,
    case when plan is null then asset else the_plan.asset_id end,
    case when plan is null then trim(new_title) else the_plan.title end,
    case when plan is null then 'perbaikan' else 'terjadwal' end,
    coalesce(due, public.pf_today())
  )
  returning id into saved;
  return saved;
end;
$$;

-- Done. A cost lands on the room for the month it was done in, shared like its other bills.
create or replace function public.pf_wo_finish(work_order uuid, done date, note text, cost numeric, room text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  the_row public.pf_work_order;
  entry uuid;
begin
  perform public.pf_require(public.pf_can_maintain());
  select * into the_row from public.pf_work_order w where w.id = work_order for update;
  if not found or the_row.status <> 'terbuka' then
    raise exception 'Perintah kerja tidak ditemukan atau sudah ditutup';
  end if;
  if done is null or done > public.pf_today() then
    raise exception 'Tanggal selesai tidak boleh di masa depan';
  end if;
  if coalesce(cost, 0) < 0 then
    raise exception 'Biaya tidak boleh negatif';
  end if;
  if coalesce(cost, 0) > 0 then
    if room is null then
      raise exception 'Pilih ruang yang menanggung biayanya';
    end if;
    insert into public.pf_cost_entry (category, description, amount, area, period_start, period_end)
    values (
      'perawatan', the_row.wo_no || ' · ' || the_row.title, cost, room,
      date_trunc('month', done)::date, (date_trunc('month', done) + interval '1 month' - interval '1 day')::date
    )
    returning id into entry;
  end if;
  update public.pf_work_order
     set status = 'selesai', done_on = done, done_note = coalesce(trim(note), ''), cost_idr = coalesce(cost, 0), cost_entry_id = entry
   where id = work_order;
  if the_row.plan_id is not null then
    update public.pf_maintenance_plan p set last_done = greatest(coalesce(p.last_done, done), done) where p.id = the_row.plan_id;
  end if;
end;
$$;

create or replace function public.pf_wo_cancel(work_order uuid, why text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.pf_require(public.pf_can_maintain());
  if coalesce(trim(why), '') = '' then
    raise exception 'Alasan wajib diisi';
  end if;
  update public.pf_work_order set status = 'batal', done_note = trim(why) where id = work_order and status = 'terbuka';
  if not found then
    raise exception 'Perintah kerja tidak ditemukan atau sudah ditutup';
  end if;
end;
$$;

-- 8. Grants ---------------------------------------------------------------------

do $$
declare
  fn text;
begin
  foreach fn in array array[
    'pf_can_read_cost()',
    'pf_can_read_maintenance()',
    'pf_batch_costs()',
    'pf_batch_cost_detail(uuid)',
    'pf_cost_entries()',
    'pf_cost_lots()',
    'pf_cost_monthly(integer)',
    'pf_lot_price_set(uuid, numeric, text)',
    'pf_labor_rate_set(text, date, numeric)',
    'pf_cost_entry_add(text, text, numeric, uuid, text, date, date)',
    'pf_cost_entry_void(uuid, text)',
    'pf_plan_save(uuid, text, uuid, integer, date, text, boolean)',
    'pf_wo_create(uuid, uuid, text, date)',
    'pf_wo_finish(uuid, date, text, numeric, text)',
    'pf_wo_cancel(uuid, text)'
  ] loop
    execute format('revoke all on function public.%s from public, anon', fn);
    execute format('grant execute on function public.%s to authenticated', fn);
  end loop;
end;
$$;

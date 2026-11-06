-- ERP inventory: every kind of stock on the tables Tahap 2 made for seed, purchasing,
-- materials used up automatically by each recipe, and stock takes. Design:
-- docs/erp-plant-factory/RENCANA-ERP-PLANT-FACTORY.md. Run manually in the Supabase
-- SQL editor after pf-sales.sql (suppliers are pf_partner, numbers use its counter).
-- Safe to run again.
--
-- Stock changes only through pf_stock_move. Lab members may read stock; only the
-- production manager, ERP admins and leadership see purchase orders and prices.
-- Operators record what they use. Every write goes through a function below.

-- 1. The Tahap 2 tables grow past seed ------------------------------------------

alter table public.pf_item drop constraint if exists pf_item_category_check;
alter table public.pf_item add constraint pf_item_category_check
  check (category in ('benih', 'nutrisi', 'media', 'kemasan', 'suku_cadang', 'lainnya'));
alter table public.pf_item drop constraint if exists pf_item_unit_check;
alter table public.pf_item add constraint pf_item_unit_check
  check (unit in ('biji', 'gram', 'kg', 'ml', 'liter', 'pcs', 'meter'));
alter table public.pf_item add column if not exists reorder_point numeric(12, 2) check (reorder_point is null or reorder_point >= 0);
alter table public.pf_item add column if not exists track_expiry boolean not null default true;
alter table public.pf_item add column if not exists active boolean not null default true;
alter table public.pf_item add column if not exists notes text not null default '';

alter table public.pf_stock_move drop constraint if exists pf_stock_move_type_check;
alter table public.pf_stock_move add constraint pf_stock_move_type_check
  check (type in ('masuk', 'pakai_semai', 'pakai_batch', 'pakai_lain', 'koreksi', 'opname'));

-- 2. New tables -----------------------------------------------------------------

create table if not exists public.pf_purchase_order (
  id          uuid primary key default gen_random_uuid(),
  po_no       text not null unique,
  supplier_id uuid not null references public.pf_partner (id) on delete restrict,
  ordered_on  date not null,
  expected_on date,
  status      text not null default 'draf' check (status in ('draf', 'dipesan', 'batal')),
  notes       text not null default '',
  cancel_note text not null default '',
  by_id       uuid default auth.uid() references auth.users (id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists pf_purchase_order_supplier_idx on public.pf_purchase_order (supplier_id);

create table if not exists public.pf_po_line (
  id           uuid primary key default gen_random_uuid(),
  po_id        uuid not null references public.pf_purchase_order (id) on delete cascade,
  item_id      uuid not null references public.pf_item (id) on delete restrict,
  qty          numeric(12, 2) not null check (qty > 0),
  unit_price   numeric(14, 2) not null check (unit_price >= 0),
  received_qty numeric(12, 2) not null default 0 check (received_qty >= 0)
);
create index if not exists pf_po_line_po_idx on public.pf_po_line (po_id);

-- A lot bought through a purchase order remembers its line, which is where its cost lives.
alter table public.pf_stock_lot add column if not exists po_line_id uuid references public.pf_po_line (id) on delete restrict;

-- What one unit of a recipe's work uses up. Belongs to a draft, like its phases.
create table if not exists public.pf_recipe_material (
  id        uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.pf_recipe (id) on delete cascade,
  item_id   uuid not null references public.pf_item (id) on delete restrict,
  basis     text not null check (basis in ('per_benih', 'per_tanaman', 'per_kg_panen')),
  qty       numeric(12, 4) not null check (qty > 0),
  unique (recipe_id, item_id, basis)
);

-- Automatic use never stops the work on the floor. What stock could not cover is
-- kept here until someone has looked at it.
create table if not exists public.pf_stock_shortage (
  id          uuid primary key default gen_random_uuid(),
  item_id     uuid not null references public.pf_item (id) on delete restrict,
  batch_id    uuid not null references public.pf_batch (id) on delete restrict,
  qty_short   numeric(12, 2) not null check (qty_short > 0),
  at          timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users (id) on delete set null,
  note        text not null default ''
);
create index if not exists pf_stock_shortage_open_idx on public.pf_stock_shortage (at desc) where resolved_at is null;

create table if not exists public.pf_stock_count (
  id         uuid primary key default gen_random_uuid(),
  counted_on date not null,
  notes      text not null default '',
  lots       integer not null default 0,
  changed    integer not null default 0,
  by_id      uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create table if not exists public.pf_stock_count_line (
  id       uuid primary key default gen_random_uuid(),
  count_id uuid not null references public.pf_stock_count (id) on delete cascade,
  lot_id   uuid not null references public.pf_stock_lot (id) on delete restrict,
  system   numeric(12, 2) not null,
  counted  numeric(12, 2) not null check (counted >= 0)
);
create index if not exists pf_stock_count_line_count_idx on public.pf_stock_count_line (count_id);

-- 3. Views ----------------------------------------------------------------------

create or replace view public.pf_item_overview with (security_invoker = true) as
select
  i.id, i.sku, i.name, i.category, i.unit, i.crop_id, i.reorder_point, i.track_expiry, i.active, i.notes,
  coalesce(s.usable, 0) as usable_qty,
  coalesce(s.expired, 0) as expired_qty,
  coalesce(s.lots, 0)::integer as lots,
  s.next_expiry,
  (i.reorder_point is not null and coalesce(s.usable, 0) <= i.reorder_point) as below_reorder,
  (select max(c.counted_on) from public.pf_stock_count c join public.pf_stock_count_line cl on cl.count_id = c.id
    join public.pf_stock_lot l on l.id = cl.lot_id where l.item_id = i.id) as last_counted_on
from public.pf_item i
left join lateral (
  select
    sum(l.qty_on_hand) filter (where l.expiry_date is null or l.expiry_date >= public.pf_today()) as usable,
    sum(l.qty_on_hand) filter (where l.expiry_date < public.pf_today()) as expired,
    count(*) filter (where l.qty_on_hand > 0) as lots,
    min(l.expiry_date) filter (where l.qty_on_hand > 0 and l.expiry_date >= public.pf_today()) as next_expiry
  from public.pf_stock_lot l where l.item_id = i.id
) s on true;

create or replace view public.pf_lot_overview with (security_invoker = true) as
select
  l.id, l.item_id, l.lot_no, l.supplier, l.qty_on_hand, l.received_at, l.expiry_date, l.notes,
  i.sku, i.name as item_name, i.category, i.unit
from public.pf_stock_lot l
join public.pf_item i on i.id = l.item_id;

create or replace view public.pf_stock_move_overview with (security_invoker = true) as
select
  m.id, m.lot_id, m.type, m.qty, m.batch_id, m.reason, m.at,
  l.lot_no, l.item_id, i.name as item_name, i.unit, b.code as batch_code
from public.pf_stock_move m
join public.pf_stock_lot l on l.id = m.lot_id
join public.pf_item i on i.id = l.item_id
left join public.pf_batch b on b.id = m.batch_id;

create or replace view public.pf_po_overview with (security_invoker = true) as
select
  p.id, p.po_no, p.supplier_id, p.ordered_on, p.expected_on, p.status, p.notes, p.cancel_note, p.created_at,
  s.name as supplier_name,
  coalesce(t.total, 0) as total,
  coalesce(t.lines, 0)::integer as lines,
  coalesce(t.open_lines, 0)::integer as open_lines,
  coalesce(t.received_lines, 0)::integer as received_lines
from public.pf_purchase_order p
join public.pf_partner s on s.id = p.supplier_id
left join lateral (
  select
    sum(round(l.qty * l.unit_price)) as total,
    count(*) as lines,
    count(*) filter (where l.received_qty < l.qty) as open_lines,
    count(*) filter (where l.received_qty > 0) as received_lines
  from public.pf_po_line l where l.po_id = p.id
) t on true;

create or replace view public.pf_po_line_overview with (security_invoker = true) as
select
  l.id, l.po_id, l.item_id, l.qty, l.unit_price, l.received_qty,
  round(l.qty * l.unit_price) as amount,
  i.sku, i.name as item_name, i.unit, i.track_expiry
from public.pf_po_line l
join public.pf_item i on i.id = l.item_id;

create or replace view public.pf_recipe_material_overview with (security_invoker = true) as
select m.id, m.recipe_id, m.item_id, m.basis, m.qty, i.sku, i.name as item_name, i.unit
from public.pf_recipe_material m
join public.pf_item i on i.id = m.item_id;

create or replace view public.pf_stock_shortage_overview with (security_invoker = true) as
select s.id, s.item_id, s.batch_id, s.qty_short, s.at, s.resolved_at, s.note, i.name as item_name, i.unit, b.code as batch_code
from public.pf_stock_shortage s
join public.pf_item i on i.id = s.item_id
join public.pf_batch b on b.id = s.batch_id;

revoke all on public.pf_item_overview, public.pf_lot_overview, public.pf_stock_move_overview, public.pf_po_overview,
  public.pf_po_line_overview, public.pf_recipe_material_overview, public.pf_stock_shortage_overview from anon;
grant select on public.pf_item_overview, public.pf_lot_overview, public.pf_stock_move_overview, public.pf_po_overview,
  public.pf_po_line_overview, public.pf_recipe_material_overview, public.pf_stock_shortage_overview to authenticated;

-- 4. Who may do what ------------------------------------------------------------

create or replace function public.pf_can_read_purchase()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.pf_can_manage_production() or public.pf_has_role(array['pimpinan']);
$$;

do $$
declare
  t text;
begin
  foreach t in array array['pf_recipe_material', 'pf_stock_shortage', 'pf_stock_count', 'pf_stock_count_line'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_read', t);
    execute format('create policy %I on public.%I for select to authenticated using (public.is_lab_member())', t || '_read', t);
    execute format('revoke insert, update, delete, truncate on public.%I from public, anon, authenticated', t);
  end loop;
  foreach t in array array['pf_purchase_order', 'pf_po_line'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_read', t);
    execute format('create policy %I on public.%I for select to authenticated using (public.pf_can_read_purchase())', t || '_read', t);
    execute format('revoke insert, update, delete, truncate on public.%I from public, anon, authenticated', t);
  end loop;
end;
$$;

-- Suppliers live with customers in pf_partner, which only sales can read. The people
-- who buy need to see the ones they buy from, and nobody else's customers.
drop policy if exists "pf_partner_supplier_read" on public.pf_partner;
create policy "pf_partner_supplier_read" on public.pf_partner for select to authenticated
  using (kind in ('pemasok', 'keduanya') and public.pf_can_read_purchase());

-- 5. Moving stock ---------------------------------------------------------------

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
    raise exception 'Lot tidak ditemukan';
  end if;
  if on_hand + delta < 0 then
    raise exception 'Stok lot tidak cukup: tersisa %, diminta %', trim_scale(on_hand), trim_scale(-delta);
  end if;
  update public.pf_stock_lot set qty_on_hand = on_hand + delta where id = lot;
  insert into public.pf_stock_move (lot_id, type, qty, batch_id, reason) values (lot, kind, delta, batch, coalesce(why, ''));
end;
$$;

-- Takes from the lot that expires first, skipping what has expired. Returns what could not be covered.
create or replace function public.pf_stock_consume(item uuid, wanted numeric, kind text, batch uuid, why text)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  remaining numeric := wanted;
  lot record;
  taken numeric;
begin
  for lot in
    select l.id, l.qty_on_hand from public.pf_stock_lot l
     where l.item_id = item and l.qty_on_hand > 0 and (l.expiry_date is null or l.expiry_date >= public.pf_today())
     order by l.expiry_date nulls last, l.received_at, l.lot_no
     for update
  loop
    exit when remaining <= 0;
    taken := least(remaining, lot.qty_on_hand);
    perform public.pf_stock_apply(lot.id, kind, -taken, batch, why);
    remaining := remaining - taken;
  end loop;
  return greatest(remaining, 0);
end;
$$;

-- What the floor records is what uses materials up, whoever records it.
create or replace function public.pf_batch_event_materials()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  wanted_basis text := case new.type when 'semai' then 'per_benih' when 'pindah_tanam' then 'per_tanaman' when 'panen' then 'per_kg_panen' end;
  material record;
  short numeric;
  label text;
begin
  if wanted_basis is null or new.qty is null or new.qty <= 0 then
    return new;
  end if;
  select code into label from public.pf_batch where id = new.batch_id;
  for material in
    select m.item_id, m.qty from public.pf_recipe_material m
      join public.pf_batch b on b.recipe_id = m.recipe_id
     where b.id = new.batch_id and m.basis = wanted_basis
  loop
    short := public.pf_stock_consume(material.item_id, round(new.qty * material.qty, 2), 'pakai_batch', new.batch_id, new.type || ' ' || label);
    if short > 0 then
      insert into public.pf_stock_shortage (item_id, batch_id, qty_short) values (material.item_id, new.batch_id, short);
    end if;
  end loop;
  return new;
end;
$$;
drop trigger if exists pf_batch_event_materials on public.pf_batch_event;
create trigger pf_batch_event_materials after insert on public.pf_batch_event
  for each row execute function public.pf_batch_event_materials();

-- A new version keeps its materials, whichever function made it.
create or replace function public.pf_recipe_copy_materials()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.parent_version_id is not null then
    insert into public.pf_recipe_material (recipe_id, item_id, basis, qty)
    select new.id, m.item_id, m.basis, m.qty from public.pf_recipe_material m where m.recipe_id = new.parent_version_id;
  end if;
  return new;
end;
$$;
drop trigger if exists pf_recipe_copy_materials on public.pf_recipe;
create trigger pf_recipe_copy_materials after insert on public.pf_recipe
  for each row execute function public.pf_recipe_copy_materials();

-- 6. What the pages call --------------------------------------------------------

create or replace function public.pf_item_save(target uuid, new_name text, new_category text, new_unit text, reorder numeric, expires boolean, new_notes text default '', is_active boolean default true)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  saved uuid;
  prefix text;
  counter integer;
  existing public.pf_item;
begin
  perform public.pf_require_manager();
  if coalesce(trim(new_name), '') = '' then
    raise exception 'Nama barang wajib diisi';
  end if;
  if reorder is not null and reorder < 0 then
    raise exception 'Batas minimum tidak boleh negatif';
  end if;
  if target is null then
    if new_category = 'benih' then
      raise exception 'Benih didaftarkan lewat halaman Lot benih';
    end if;
    prefix := case new_category when 'nutrisi' then 'NUT' when 'media' then 'MED' when 'kemasan' then 'KMS' when 'suku_cadang' then 'SKC' else 'LNY' end;
    insert into public.pf_doc_counter as c (key, value) values ('SKU-' || prefix, 1)
    on conflict (key) do update set value = c.value + 1 returning value into counter;
    insert into public.pf_item (sku, name, category, unit, reorder_point, track_expiry, notes, active)
    values (prefix || '-' || lpad(counter::text, 3, '0'), trim(new_name), new_category, new_unit, reorder, coalesce(expires, true), trim(coalesce(new_notes, '')), coalesce(is_active, true))
    returning id into saved;
  else
    select * into existing from public.pf_item i where i.id = target for update;
    if not found then
      raise exception 'Barang tidak ditemukan';
    end if;
    if existing.unit <> new_unit and exists (select 1 from public.pf_stock_lot l where l.item_id = target) then
      raise exception 'Satuan tidak bisa diubah karena barang ini sudah punya stok';
    end if;
    if existing.category = 'benih' and new_category <> 'benih' or existing.category <> 'benih' and new_category = 'benih' then
      raise exception 'Kategori benih tidak bisa ditukar';
    end if;
    update public.pf_item i
       set name = trim(new_name), category = new_category, unit = new_unit, reorder_point = reorder,
           track_expiry = coalesce(expires, true), notes = trim(coalesce(new_notes, '')), active = coalesce(is_active, true)
     where i.id = target;
    saved := target;
  end if;
  return saved;
end;
$$;

-- Stock that arrives without a purchase order: a gift, a sample, or what was on the shelf at the start.
create or replace function public.pf_stock_receive(item uuid, new_lot_no text, qty numeric, received_on date, expiry_on date, new_supplier text default '', new_notes text default '')
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  the_item public.pf_item;
  created uuid;
begin
  perform public.pf_require_manager();
  select * into the_item from public.pf_item i where i.id = item and i.active;
  if not found then
    raise exception 'Barang tidak ditemukan atau nonaktif';
  end if;
  if coalesce(trim(new_lot_no), '') = '' then
    raise exception 'Nomor lot wajib diisi';
  end if;
  if qty is null or qty <= 0 then
    raise exception 'Jumlah harus lebih dari 0';
  end if;
  if received_on is null or received_on > public.pf_today() then
    raise exception 'Tanggal terima tidak boleh di masa depan';
  end if;
  if expiry_on is not null and expiry_on < received_on then
    raise exception 'Tanggal kedaluwarsa sebelum tanggal diterima';
  end if;
  insert into public.pf_stock_lot (item_id, lot_no, supplier, qty_on_hand, received_at, expiry_date, notes)
  values (item, trim(new_lot_no), trim(coalesce(new_supplier, '')), 0, received_on, expiry_on, trim(coalesce(new_notes, '')))
  returning id into created;
  perform public.pf_stock_apply(created, 'masuk', qty, null, 'Diterima tanpa pesanan pembelian');
  return created;
end;
$$;

create or replace function public.pf_stock_adjust(lot uuid, new_qty numeric, why text)
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
    raise exception 'Alasan koreksi wajib diisi';
  end if;
  if new_qty is null or new_qty < 0 then
    raise exception 'Jumlah tidak boleh negatif';
  end if;
  select l.qty_on_hand into on_hand from public.pf_stock_lot l where l.id = lot for update;
  if not found then
    raise exception 'Lot tidak ditemukan';
  end if;
  if new_qty = on_hand then
    raise exception 'Jumlahnya sama dengan stok sekarang';
  end if;
  perform public.pf_stock_apply(lot, 'koreksi', new_qty - on_hand, null, trim(why));
end;
$$;

-- Used by hand: nutrient mixed today, a spare part fitted. All or nothing, earliest expiry first.
create or replace function public.pf_stock_use(item uuid, qty numeric, batch uuid, why text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  short numeric;
  label text;
begin
  perform public.pf_require_operator();
  if qty is null or qty <= 0 then
    raise exception 'Jumlah harus lebih dari 0';
  end if;
  if not exists (select 1 from public.pf_item i where i.id = item) then
    raise exception 'Barang tidak ditemukan';
  end if;
  if batch is not null and not exists (select 1 from public.pf_batch b where b.id = batch and b.status = 'berjalan') then
    raise exception 'Batch tidak sedang berjalan';
  end if;
  if batch is null and coalesce(trim(why), '') = '' then
    raise exception 'Tulis untuk apa barang ini dipakai';
  end if;
  short := public.pf_stock_consume(item, qty, case when batch is null then 'pakai_lain' else 'pakai_batch' end, batch, trim(coalesce(why, '')));
  if short > 0 then
    select unit into label from public.pf_item i where i.id = item;
    raise exception 'Stok siap pakai tidak cukup: kurang % %', trim_scale(short), label;
  end if;
end;
$$;

-- A stock take: what was counted replaces what the system said, and every difference is a move.
create or replace function public.pf_stock_count_apply(counted date, new_notes text, rows_in jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  created uuid;
  item jsonb;
  lot_id uuid;
  physical numeric;
  on_hand numeric;
  total integer := 0;
  differing integer := 0;
  label text;
begin
  perform public.pf_require_manager();
  if counted is null or counted > public.pf_today() then
    raise exception 'Tanggal opname tidak boleh di masa depan';
  end if;
  if jsonb_typeof(rows_in) is distinct from 'array' or jsonb_array_length(rows_in) = 0 then
    raise exception 'Isi minimal satu lot yang dihitung';
  end if;
  insert into public.pf_stock_count (counted_on, notes) values (counted, trim(coalesce(new_notes, ''))) returning id into created;
  label := 'Opname ' || to_char(counted, 'YYYY-MM-DD');
  for item in select * from jsonb_array_elements(rows_in) loop
    lot_id := (item ->> 'lot_id')::uuid;
    physical := (item ->> 'counted')::numeric;
    if physical is null or physical < 0 then
      raise exception 'Hasil hitung tidak boleh negatif';
    end if;
    select l.qty_on_hand into on_hand from public.pf_stock_lot l where l.id = lot_id for update;
    if not found then
      raise exception 'Lot tidak ditemukan';
    end if;
    insert into public.pf_stock_count_line (count_id, lot_id, system, counted) values (created, lot_id, on_hand, physical);
    total := total + 1;
    if physical <> on_hand then
      perform public.pf_stock_apply(lot_id, 'opname', physical - on_hand, null, label);
      differing := differing + 1;
    end if;
  end loop;
  update public.pf_stock_count c set lots = total, changed = differing where c.id = created;
  return created;
end;
$$;

create or replace function public.pf_supplier_save(partner uuid, new_name text, new_contact text, new_phone text, new_email text, new_address text, new_tax_id text, new_notes text, is_active boolean default true)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  saved uuid;
  existing_kind text;
begin
  perform public.pf_require_manager();
  if coalesce(trim(new_name), '') = '' then
    raise exception 'Nama wajib diisi';
  end if;
  if partner is null then
    insert into public.pf_partner (name, kind, contact_name, phone, email, address, tax_id, notes, active)
    values (trim(new_name), 'pemasok', trim(coalesce(new_contact, '')), trim(coalesce(new_phone, '')), trim(coalesce(new_email, '')), trim(coalesce(new_address, '')), trim(coalesce(new_tax_id, '')), trim(coalesce(new_notes, '')), coalesce(is_active, true))
    returning id into saved;
    return saved;
  end if;
  select p.kind into existing_kind from public.pf_partner p where p.id = partner for update;
  if existing_kind is null or existing_kind = 'pelanggan' then
    raise exception 'Pemasok tidak ditemukan';
  end if;
  update public.pf_partner p
     set name = trim(new_name), contact_name = trim(coalesce(new_contact, '')), phone = trim(coalesce(new_phone, '')), email = trim(coalesce(new_email, '')),
         address = trim(coalesce(new_address, '')), tax_id = trim(coalesce(new_tax_id, '')), notes = trim(coalesce(new_notes, '')), active = coalesce(is_active, true)
   where p.id = partner;
  return partner;
end;
$$;

-- Purchase orders ---------------------------------------------------------------

create or replace function public.pf_po_save(target uuid, supplier uuid, ordered date, expected date, new_notes text, lines jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  saved uuid;
  state text;
  item jsonb;
begin
  perform public.pf_require_manager();
  if not exists (select 1 from public.pf_partner p where p.id = supplier and p.active and p.kind in ('pemasok', 'keduanya')) then
    raise exception 'Pilih pemasok yang aktif';
  end if;
  if ordered is null then
    raise exception 'Tanggal pesan wajib diisi';
  end if;
  if expected is not null and expected < ordered then
    raise exception 'Perkiraan tiba sebelum tanggal pesan';
  end if;
  if jsonb_typeof(lines) is distinct from 'array' or jsonb_array_length(lines) = 0 then
    raise exception 'Pesanan pembelian minimal satu baris';
  end if;
  if target is null then
    insert into public.pf_purchase_order (po_no, supplier_id, ordered_on, expected_on, notes)
    values (public.pf_next_doc_no('PO', ordered), supplier, ordered, expected, trim(coalesce(new_notes, '')))
    returning id into saved;
  else
    select p.status into state from public.pf_purchase_order p where p.id = target for update;
    if state is distinct from 'draf' then
      raise exception 'Hanya draf yang bisa diubah';
    end if;
    update public.pf_purchase_order p set supplier_id = supplier, ordered_on = ordered, expected_on = expected, notes = trim(coalesce(new_notes, '')) where p.id = target;
    delete from public.pf_po_line l where l.po_id = target;
    saved := target;
  end if;
  for item in select * from jsonb_array_elements(lines) loop
    insert into public.pf_po_line (po_id, item_id, qty, unit_price)
    values (saved, (item ->> 'item_id')::uuid, (item ->> 'qty')::numeric, (item ->> 'unit_price')::numeric);
  end loop;
  return saved;
end;
$$;

create or replace function public.pf_po_place(target uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.pf_require_manager();
  update public.pf_purchase_order p set status = 'dipesan' where p.id = target and p.status = 'draf';
  if not found then
    raise exception 'Pesanan pembelian ini bukan draf';
  end if;
end;
$$;

create or replace function public.pf_po_cancel(target uuid, why text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  state text;
begin
  perform public.pf_require_manager();
  if coalesce(trim(why), '') = '' then
    raise exception 'Alasan wajib diisi';
  end if;
  select p.status into state from public.pf_purchase_order p where p.id = target for update;
  if state is null or state = 'batal' then
    raise exception 'Pesanan pembelian tidak ditemukan atau sudah dibatalkan';
  end if;
  if exists (select 1 from public.pf_po_line l where l.po_id = target and l.received_qty > 0) then
    raise exception 'Barang sudah ada yang diterima. Koreksi lewat stok.';
  end if;
  update public.pf_purchase_order p set status = 'batal', cancel_note = trim(why) where p.id = target;
end;
$$;

create or replace function public.pf_po_receive(line uuid, qty numeric, new_lot_no text, received_on date, expiry_on date default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  the_line public.pf_po_line;
  the_po public.pf_purchase_order;
  the_item public.pf_item;
  supplier_name text;
  created uuid;
begin
  perform public.pf_require_manager();
  select * into the_line from public.pf_po_line l where l.id = line for update;
  if not found then
    raise exception 'Baris tidak ditemukan';
  end if;
  select * into the_po from public.pf_purchase_order p where p.id = the_line.po_id for update;
  if the_po.status <> 'dipesan' then
    raise exception 'Pesanan pembelian belum dipesan atau sudah dibatalkan';
  end if;
  select * into the_item from public.pf_item i where i.id = the_line.item_id;
  if qty is null or qty <= 0 then
    raise exception 'Jumlah harus lebih dari 0';
  end if;
  if the_line.received_qty + qty > the_line.qty then
    raise exception 'Melebihi pesanan: masih kurang % %', trim_scale(the_line.qty - the_line.received_qty), the_item.unit;
  end if;
  if coalesce(trim(new_lot_no), '') = '' then
    raise exception 'Nomor lot wajib diisi';
  end if;
  if received_on is null or received_on > public.pf_today() then
    raise exception 'Tanggal terima tidak boleh di masa depan';
  end if;
  if received_on < the_po.ordered_on then
    raise exception 'Tanggal terima sebelum tanggal pesan';
  end if;
  if expiry_on is not null and expiry_on < received_on then
    raise exception 'Tanggal kedaluwarsa sebelum tanggal diterima';
  end if;
  if the_item.track_expiry and expiry_on is null then
    raise exception 'Tanggal kedaluwarsa wajib diisi untuk barang ini';
  end if;
  select p.name into supplier_name from public.pf_partner p where p.id = the_po.supplier_id;
  insert into public.pf_stock_lot (item_id, lot_no, supplier, qty_on_hand, received_at, expiry_date, po_line_id)
  values (the_line.item_id, trim(new_lot_no), supplier_name, 0, received_on, expiry_on, line)
  returning id into created;
  perform public.pf_stock_apply(created, 'masuk', qty, null, the_po.po_no);
  update public.pf_po_line l set received_qty = l.received_qty + pf_po_receive.qty where l.id = line;
  return created;
end;
$$;

-- Recipes and shortages ---------------------------------------------------------

create or replace function public.pf_recipe_materials_save(recipe uuid, materials jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  state text;
  item jsonb;
begin
  perform public.pf_require_manager();
  select r.status into state from public.pf_recipe r where r.id = recipe;
  if state is distinct from 'draft' then
    raise exception 'Bahan hanya bisa diubah pada draf resep. Buat versi baru.';
  end if;
  delete from public.pf_recipe_material m where m.recipe_id = recipe;
  for item in select * from jsonb_array_elements(coalesce(materials, '[]'::jsonb)) loop
    insert into public.pf_recipe_material (recipe_id, item_id, basis, qty)
    values (recipe, (item ->> 'item_id')::uuid, item ->> 'basis', (item ->> 'qty')::numeric);
  end loop;
end;
$$;

create or replace function public.pf_shortage_resolve(shortage uuid, why text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.pf_require_manager();
  if coalesce(trim(why), '') = '' then
    raise exception 'Tulis bagaimana kekurangannya ditangani';
  end if;
  update public.pf_stock_shortage s set resolved_at = now(), resolved_by = auth.uid(), note = trim(why) where s.id = shortage and s.resolved_at is null;
  if not found then
    raise exception 'Sudah ditangani';
  end if;
end;
$$;

-- 7. Who may call what ----------------------------------------------------------

do $$
declare
  fn text;
begin
  foreach fn in array array[
    'pf_stock_apply(uuid, text, numeric, uuid, text)',
    'pf_stock_consume(uuid, numeric, text, uuid, text)'
  ] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', fn);
  end loop;
  foreach fn in array array[
    'pf_can_read_purchase()',
    'pf_item_save(uuid, text, text, text, numeric, boolean, text, boolean)',
    'pf_stock_receive(uuid, text, numeric, date, date, text, text)',
    'pf_stock_adjust(uuid, numeric, text)',
    'pf_stock_use(uuid, numeric, uuid, text)',
    'pf_stock_count_apply(date, text, jsonb)',
    'pf_supplier_save(uuid, text, text, text, text, text, text, text, boolean)',
    'pf_po_save(uuid, uuid, date, date, text, jsonb)',
    'pf_po_place(uuid)',
    'pf_po_cancel(uuid, text)',
    'pf_po_receive(uuid, numeric, text, date, date)',
    'pf_recipe_materials_save(uuid, jsonb)',
    'pf_shortage_resolve(uuid, text)'
  ] loop
    execute format('revoke all on function public.%s from public, anon', fn);
    execute format('grant execute on function public.%s to authenticated', fn);
  end loop;
end;
$$;

-- 8. Audit ----------------------------------------------------------------------

do $$
declare
  audited text;
begin
  foreach audited in array array['pf_purchase_order', 'pf_po_line', 'pf_recipe_material', 'pf_stock_count', 'pf_stock_shortage'] loop
    execute format('drop trigger if exists pf_audit on public.%I', audited);
    execute format(
      'create trigger pf_audit after insert or update or delete on public.%I for each row execute function public.pf_audit()',
      audited
    );
  end loop;
end;
$$;

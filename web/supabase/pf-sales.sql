-- ERP sales: customers, orders, allocating harvest lots, delivery, invoices with
-- optional tax, payments, and the trace from an order back to its seed lot. Design:
-- docs/erp-plant-factory/RENCANA-ERP-PLANT-FACTORY.md. Run manually in the Supabase
-- SQL editor after pf-foundation.sql and pf-batch.sql. Safe to run again.
--
-- Customers and prices are not for every lab member: Sales staff, ERP admins,
-- leadership and the production manager may read, Sales staff and ERP admins may
-- write. Every write goes through a function below, so no table has a write policy.
-- Records are corrected or cancelled, never deleted.

-- 1. Roles ---------------------------------------------------------------------

create or replace function public.pf_can_sell()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.pf_is_admin() or public.pf_has_role(array['staf_penjualan']);
$$;

create or replace function public.pf_can_read_sales()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.pf_can_sell() or public.pf_has_role(array['pimpinan', 'manajer_produksi']);
$$;

create or replace function public.pf_require_seller()
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.pf_can_sell() then
    raise exception 'Akun Anda tidak punya izin untuk tindakan ini.' using errcode = '42501';
  end if;
end;
$$;

-- 2. Tables --------------------------------------------------------------------

-- Gapless, unlike a sequence: a rolled-back invoice does not leave a hole in the numbers.
create table if not exists public.pf_doc_counter (
  key   text primary key,
  value integer not null default 0
);

create table if not exists public.pf_partner (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (length(trim(name)) > 0),
  kind         text not null default 'pelanggan' check (kind in ('pelanggan', 'pemasok', 'keduanya')),
  contact_name text not null default '',
  phone        text not null default '',
  email        text not null default '',
  address      text not null default '',
  tax_id       text not null default '',
  notes        text not null default '',
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);

create table if not exists public.pf_tax_rate (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (length(trim(name)) > 0),
  percent    numeric(5, 2) not null check (percent >= 0 and percent <= 100),
  valid_from date not null,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.pf_sales_order (
  id           uuid primary key default gen_random_uuid(),
  so_no        text not null unique,
  partner_id   uuid not null references public.pf_partner (id) on delete restrict,
  ordered_on   date not null,
  requested_on date,
  status       text not null default 'draf' check (status in ('draf', 'dikonfirmasi', 'batal')),
  notes        text not null default '',
  cancel_note  text not null default '',
  by_id        uuid default auth.uid() references auth.users (id) on delete set null,
  created_at   timestamptz not null default now()
);
create index if not exists pf_sales_order_partner_idx on public.pf_sales_order (partner_id);

-- What the customer asked for: a crop and a grade, which may not be harvested yet.
create table if not exists public.pf_so_line (
  id             uuid primary key default gen_random_uuid(),
  sales_order_id uuid not null references public.pf_sales_order (id) on delete cascade,
  crop_id        uuid not null references public.pf_crop (id) on delete restrict,
  grade          text not null check (grade in ('A', 'B', 'Afkir')),
  qty_kg         numeric(10, 3) not null check (qty_kg > 0),
  price_per_kg   numeric(12, 2) not null check (price_per_kg >= 0)
);
create index if not exists pf_so_line_order_idx on public.pf_so_line (sales_order_id);

create table if not exists public.pf_delivery (
  id             uuid primary key default gen_random_uuid(),
  delivery_no    text not null unique,
  sales_order_id uuid not null references public.pf_sales_order (id) on delete restrict,
  delivered_on   date not null,
  recipient      text not null default '',
  notes          text not null default '',
  cancelled_at   timestamptz,
  cancel_note    text not null default '',
  by_id          uuid default auth.uid() references auth.users (id) on delete set null,
  created_at     timestamptz not null default now()
);
create index if not exists pf_delivery_order_idx on public.pf_delivery (sales_order_id);

-- The trace key: exactly which harvest lot filled which order line. A row is taken
-- from the lot's remaining kg when it is made, and given back if it is released.
create table if not exists public.pf_so_allocation (
  id             uuid primary key default gen_random_uuid(),
  so_line_id     uuid not null references public.pf_so_line (id) on delete restrict,
  harvest_lot_id uuid not null references public.pf_harvest_lot (id) on delete restrict,
  qty_kg         numeric(10, 3) not null check (qty_kg > 0),
  delivery_id    uuid references public.pf_delivery (id) on delete restrict,
  by_id          uuid default auth.uid() references auth.users (id) on delete set null,
  created_at     timestamptz not null default now()
);
create index if not exists pf_so_allocation_line_idx on public.pf_so_allocation (so_line_id);
create index if not exists pf_so_allocation_lot_idx on public.pf_so_allocation (harvest_lot_id);
create index if not exists pf_so_allocation_delivery_idx on public.pf_so_allocation (delivery_id);

create table if not exists public.pf_invoice (
  id             uuid primary key default gen_random_uuid(),
  invoice_no     text not null unique,
  sales_order_id uuid not null references public.pf_sales_order (id) on delete restrict,
  issued_on      date not null,
  due_on         date not null,
  subtotal       numeric(14, 0) not null,
  tax_rate_id    uuid references public.pf_tax_rate (id) on delete restrict,
  -- Copied, so an old invoice does not change when the rate does.
  tax_name       text not null default '',
  tax_percent    numeric(5, 2) not null default 0,
  tax_amount     numeric(14, 0) not null default 0,
  total          numeric(14, 0) not null,
  notes          text not null default '',
  status         text not null default 'terbit' check (status in ('terbit', 'batal')),
  void_note      text not null default '',
  by_id          uuid default auth.uid() references auth.users (id) on delete set null,
  created_at     timestamptz not null default now(),
  check (due_on >= issued_on)
);
create index if not exists pf_invoice_order_idx on public.pf_invoice (sales_order_id);

create table if not exists public.pf_invoice_line (
  id           uuid primary key default gen_random_uuid(),
  invoice_id   uuid not null references public.pf_invoice (id) on delete cascade,
  so_line_id   uuid not null references public.pf_so_line (id) on delete restrict,
  description  text not null,
  qty_kg       numeric(10, 3) not null check (qty_kg > 0),
  price_per_kg numeric(12, 2) not null,
  amount       numeric(14, 0) not null
);
create index if not exists pf_invoice_line_invoice_idx on public.pf_invoice_line (invoice_id);
create index if not exists pf_invoice_line_so_line_idx on public.pf_invoice_line (so_line_id);

create table if not exists public.pf_payment (
  id         uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.pf_invoice (id) on delete restrict,
  paid_on    date not null,
  amount     numeric(14, 0) not null check (amount > 0),
  method     text not null check (method in ('transfer', 'tunai', 'lainnya')),
  reference  text not null default '',
  voided_at  timestamptz,
  void_note  text not null default '',
  by_id      uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists pf_payment_invoice_idx on public.pf_payment (invoice_id);

-- 3. A lot's grade is what its allocations were matched on ----------------------

create or replace function public.pf_harvest_lot_sold_guard()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.grade <> old.grade and exists (select 1 from public.pf_so_allocation a where a.harvest_lot_id = old.id) then
    raise exception 'Grade lot % tidak bisa diubah karena sudah dialokasikan ke pesanan', old.lot_code;
  end if;
  return new;
end;
$$;
drop trigger if exists pf_harvest_lot_sold_guard on public.pf_harvest_lot;
create trigger pf_harvest_lot_sold_guard before update on public.pf_harvest_lot
  for each row execute function public.pf_harvest_lot_sold_guard();

-- 4. Views: the pages read these, with the caller's RLS -------------------------

create or replace view public.pf_order_line_overview with (security_invoker = true) as
select
  l.id, l.sales_order_id, l.crop_id, l.grade, l.qty_kg, l.price_per_kg,
  c.name as crop_name, c.variety as crop_variety,
  round(l.qty_kg * l.price_per_kg) as amount,
  coalesce(al.allocated_kg, 0) as allocated_kg,
  coalesce(al.delivered_kg, 0) as delivered_kg,
  coalesce(inv.invoiced_kg, 0) as invoiced_kg
from public.pf_so_line l
join public.pf_crop c on c.id = l.crop_id
left join lateral (
  select sum(a.qty_kg) as allocated_kg, sum(a.qty_kg) filter (where a.delivery_id is not null) as delivered_kg
    from public.pf_so_allocation a where a.so_line_id = l.id
) al on true
left join lateral (
  select sum(il.qty_kg) as invoiced_kg
    from public.pf_invoice_line il join public.pf_invoice i on i.id = il.invoice_id
   where il.so_line_id = l.id and i.status = 'terbit'
) inv on true;

create or replace view public.pf_order_overview with (security_invoker = true) as
select
  o.id, o.so_no, o.partner_id, o.ordered_on, o.requested_on, o.status, o.notes, o.cancel_note, o.created_at,
  p.name as partner_name,
  coalesce(t.ordered_kg, 0) as ordered_kg,
  coalesce(t.allocated_kg, 0) as allocated_kg,
  coalesce(t.delivered_kg, 0) as delivered_kg,
  coalesce(t.invoiced_kg, 0) as invoiced_kg,
  coalesce(t.amount, 0) as amount,
  coalesce(b.invoiced_amount, 0) as invoiced_amount,
  coalesce(b.paid_amount, 0) as paid_amount
from public.pf_sales_order o
join public.pf_partner p on p.id = o.partner_id
left join lateral (
  select sum(v.qty_kg) as ordered_kg, sum(v.allocated_kg) as allocated_kg, sum(v.delivered_kg) as delivered_kg,
         sum(v.invoiced_kg) as invoiced_kg, sum(v.amount) as amount
    from public.pf_order_line_overview v where v.sales_order_id = o.id
) t on true
left join lateral (
  select sum(i.total) as invoiced_amount,
         (select coalesce(sum(pay.amount), 0) from public.pf_payment pay join public.pf_invoice x on x.id = pay.invoice_id
           where x.sales_order_id = o.id and x.status = 'terbit' and pay.voided_at is null) as paid_amount
    from public.pf_invoice i where i.sales_order_id = o.id and i.status = 'terbit'
) b on true;

create or replace view public.pf_allocation_overview with (security_invoker = true) as
select
  a.id, a.so_line_id, l.sales_order_id, a.harvest_lot_id, a.qty_kg, a.delivery_id,
  h.lot_code, h.grade, h.harvested_at, h.best_before,
  b.code as batch_code, b.id as batch_id,
  d.delivery_no, d.delivered_on
from public.pf_so_allocation a
join public.pf_so_line l on l.id = a.so_line_id
join public.pf_harvest_lot h on h.id = a.harvest_lot_id
join public.pf_batch b on b.id = h.batch_id
left join public.pf_delivery d on d.id = a.delivery_id;

create or replace view public.pf_invoice_overview with (security_invoker = true) as
select
  i.id, i.invoice_no, i.sales_order_id, i.issued_on, i.due_on, i.subtotal, i.tax_name, i.tax_percent, i.tax_amount,
  i.total, i.notes, i.status, i.void_note, i.created_at,
  o.so_no, o.partner_id, p.name as partner_name, p.address as partner_address, p.tax_id as partner_tax_id,
  coalesce(pay.paid, 0) as paid,
  i.total - coalesce(pay.paid, 0) as balance
from public.pf_invoice i
join public.pf_sales_order o on o.id = i.sales_order_id
join public.pf_partner p on p.id = o.partner_id
left join lateral (
  select sum(x.amount) as paid from public.pf_payment x where x.invoice_id = i.id and x.voided_at is null
) pay on true;

-- What can still be allocated. Harvest lots are open to members; this adds the crop.
create or replace view public.pf_lot_available with (security_invoker = true) as
select
  h.id, h.lot_code, h.grade, h.remaining_kg, h.fresh_kg, h.harvested_at, h.best_before, h.batch_id,
  b.code as batch_code, r.crop_id, c.name as crop_name, c.variety as crop_variety
from public.pf_harvest_lot h
join public.pf_batch b on b.id = h.batch_id
join public.pf_recipe r on r.id = b.recipe_id
join public.pf_crop c on c.id = r.crop_id
where h.remaining_kg > 0;

revoke all on public.pf_order_line_overview, public.pf_order_overview, public.pf_allocation_overview, public.pf_invoice_overview, public.pf_lot_available from anon;
grant select on public.pf_order_line_overview, public.pf_order_overview, public.pf_allocation_overview, public.pf_invoice_overview, public.pf_lot_available to authenticated;

-- 5. Row level security ---------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array['pf_partner', 'pf_tax_rate', 'pf_sales_order', 'pf_so_line', 'pf_so_allocation', 'pf_delivery',
                           'pf_invoice', 'pf_invoice_line', 'pf_payment'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_read', t);
    execute format('create policy %I on public.%I for select to authenticated using (public.pf_can_read_sales())', t || '_read', t);
    execute format('revoke insert, update, delete, truncate on public.%I from public, anon, authenticated', t);
  end loop;
  alter table public.pf_doc_counter enable row level security;
  revoke all on public.pf_doc_counter from public, anon, authenticated;
end;
$$;

-- 6. Helpers -------------------------------------------------------------------

create or replace function public.pf_next_doc_no(prefix text, on_day date)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  counter_key text := prefix || '-' || to_char(on_day, 'YYYY');
  next_value integer;
begin
  insert into public.pf_doc_counter as c (key, value) values (counter_key, 1)
  on conflict (key) do update set value = c.value + 1
  returning value into next_value;
  return counter_key || '-' || lpad(next_value::text, 4, '0');
end;
$$;

create or replace function public.pf_order_lock(target uuid)
returns public.pf_sales_order
language plpgsql
security definer
set search_path = public
as $$
declare
  found_order public.pf_sales_order;
begin
  select * into found_order from public.pf_sales_order o where o.id = target for update;
  if not found then
    raise exception 'Pesanan tidak ditemukan';
  end if;
  return found_order;
end;
$$;

-- 7. Partners and tax rates -----------------------------------------------------

create or replace function public.pf_partner_save(partner uuid, new_name text, new_kind text, new_contact text, new_phone text, new_email text, new_address text, new_tax_id text, new_notes text, is_active boolean default true)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  saved uuid;
begin
  perform public.pf_require_seller();
  if coalesce(trim(new_name), '') = '' then
    raise exception 'Nama wajib diisi';
  end if;
  if partner is null then
    insert into public.pf_partner (name, kind, contact_name, phone, email, address, tax_id, notes, active)
    values (trim(new_name), coalesce(new_kind, 'pelanggan'), trim(coalesce(new_contact, '')), trim(coalesce(new_phone, '')), trim(coalesce(new_email, '')), trim(coalesce(new_address, '')), trim(coalesce(new_tax_id, '')), trim(coalesce(new_notes, '')), coalesce(is_active, true))
    returning id into saved;
  else
    update public.pf_partner p
       set name = trim(new_name), kind = coalesce(new_kind, 'pelanggan'), contact_name = trim(coalesce(new_contact, '')), phone = trim(coalesce(new_phone, '')),
           email = trim(coalesce(new_email, '')), address = trim(coalesce(new_address, '')), tax_id = trim(coalesce(new_tax_id, '')), notes = trim(coalesce(new_notes, '')), active = coalesce(is_active, true)
     where p.id = partner
    returning p.id into saved;
    if saved is null then
      raise exception 'Pelanggan tidak ditemukan';
    end if;
  end if;
  return saved;
end;
$$;

create or replace function public.pf_tax_rate_save(rate uuid, new_name text, new_percent numeric, starts_on date, is_active boolean default true)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  saved uuid;
begin
  perform public.pf_require_seller();
  if coalesce(trim(new_name), '') = '' then
    raise exception 'Nama tarif wajib diisi';
  end if;
  if new_percent is null or new_percent < 0 or new_percent > 100 then
    raise exception 'Tarif harus antara 0 dan 100 persen';
  end if;
  if rate is null then
    insert into public.pf_tax_rate (name, percent, valid_from, active) values (trim(new_name), new_percent, coalesce(starts_on, public.pf_today()), coalesce(is_active, true))
    returning id into saved;
  else
    -- A rate that invoices used keeps its number: a new rate is a new row. Invoices hold their own copy anyway.
    update public.pf_tax_rate r set name = trim(new_name), percent = new_percent, valid_from = coalesce(starts_on, r.valid_from), active = coalesce(is_active, true)
     where r.id = rate
    returning r.id into saved;
    if saved is null then
      raise exception 'Tarif tidak ditemukan';
    end if;
  end if;
  return saved;
end;
$$;

-- 8. Orders ---------------------------------------------------------------------

-- Creates a draft, or replaces a draft's header and lines whole.
create or replace function public.pf_order_save(target uuid, partner uuid, ordered date, requested date, new_notes text, lines jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  saved uuid;
  current_order public.pf_sales_order;
  item jsonb;
begin
  perform public.pf_require_seller();
  if not exists (select 1 from public.pf_partner p where p.id = partner and p.active) then
    raise exception 'Pilih pelanggan yang aktif';
  end if;
  if ordered is null then
    raise exception 'Tanggal pesanan wajib diisi';
  end if;
  if requested is not null and requested < ordered then
    raise exception 'Tanggal diminta sebelum tanggal pesanan';
  end if;
  if jsonb_typeof(lines) is distinct from 'array' or jsonb_array_length(lines) = 0 then
    raise exception 'Pesanan minimal satu baris';
  end if;
  if target is null then
    insert into public.pf_sales_order (so_no, partner_id, ordered_on, requested_on, notes)
    values (public.pf_next_doc_no('SO', ordered), partner, ordered, requested, trim(coalesce(new_notes, '')))
    returning id into saved;
  else
    current_order := public.pf_order_lock(target);
    if current_order.status <> 'draf' then
      raise exception 'Hanya pesanan draf yang bisa diubah';
    end if;
    update public.pf_sales_order o set partner_id = partner, ordered_on = ordered, requested_on = requested, notes = trim(coalesce(new_notes, '')) where o.id = target;
    delete from public.pf_so_line l where l.sales_order_id = target;
    saved := target;
  end if;
  for item in select * from jsonb_array_elements(lines) loop
    if not exists (select 1 from public.pf_crop c where c.id = (item ->> 'crop_id')::uuid) then
      raise exception 'Tanaman tidak ditemukan';
    end if;
    insert into public.pf_so_line (sales_order_id, crop_id, grade, qty_kg, price_per_kg)
    values (saved, (item ->> 'crop_id')::uuid, item ->> 'grade', (item ->> 'qty_kg')::numeric, (item ->> 'price_per_kg')::numeric);
  end loop;
  return saved;
end;
$$;

create or replace function public.pf_order_confirm(target uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_order public.pf_sales_order;
begin
  perform public.pf_require_seller();
  current_order := public.pf_order_lock(target);
  if current_order.status <> 'draf' then
    raise exception 'Pesanan ini sudah dikonfirmasi atau dibatalkan';
  end if;
  update public.pf_sales_order o set status = 'dikonfirmasi' where o.id = target;
end;
$$;

-- Everything still only reserved goes back to its lot. What has left the building cannot.
create or replace function public.pf_order_cancel(target uuid, why text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_order public.pf_sales_order;
  reserved record;
begin
  perform public.pf_require_seller();
  if coalesce(trim(why), '') = '' then
    raise exception 'Alasan wajib diisi';
  end if;
  current_order := public.pf_order_lock(target);
  if current_order.status = 'batal' then
    raise exception 'Pesanan ini sudah dibatalkan';
  end if;
  if exists (select 1 from public.pf_so_allocation a join public.pf_so_line l on l.id = a.so_line_id where l.sales_order_id = target and a.delivery_id is not null) then
    raise exception 'Pesanan sudah ada yang dikirim. Batalkan pengirimannya dulu.';
  end if;
  if exists (select 1 from public.pf_invoice i where i.sales_order_id = target and i.status = 'terbit') then
    raise exception 'Pesanan punya invoice terbit. Batalkan invoice-nya dulu.';
  end if;
  for reserved in
    select a.id, a.harvest_lot_id, a.qty_kg from public.pf_so_allocation a join public.pf_so_line l on l.id = a.so_line_id where l.sales_order_id = target
  loop
    update public.pf_harvest_lot h set remaining_kg = h.remaining_kg + reserved.qty_kg where h.id = reserved.harvest_lot_id;
    delete from public.pf_so_allocation a where a.id = reserved.id;
  end loop;
  update public.pf_sales_order o set status = 'batal', cancel_note = trim(why) where o.id = target;
end;
$$;

-- 9. Allocation -----------------------------------------------------------------

create or replace function public.pf_allocate(line uuid, lot uuid, kg numeric)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  the_line public.pf_so_line;
  the_lot public.pf_harvest_lot;
  current_order public.pf_sales_order;
  lot_crop uuid;
  taken numeric;
  saved uuid;
begin
  perform public.pf_require_seller();
  select * into the_line from public.pf_so_line l where l.id = line;
  if not found then
    raise exception 'Baris pesanan tidak ditemukan';
  end if;
  current_order := public.pf_order_lock(the_line.sales_order_id);
  if current_order.status <> 'dikonfirmasi' then
    raise exception 'Konfirmasi pesanan dulu sebelum memilih lot';
  end if;
  if kg is null or kg <= 0 then
    raise exception 'Berat harus lebih dari 0';
  end if;
  select * into the_lot from public.pf_harvest_lot h where h.id = lot for update;
  if not found then
    raise exception 'Lot panen tidak ditemukan';
  end if;
  select r.crop_id into lot_crop from public.pf_batch b join public.pf_recipe r on r.id = b.recipe_id where b.id = the_lot.batch_id;
  if lot_crop <> the_line.crop_id then
    raise exception 'Lot % berisi tanaman lain', the_lot.lot_code;
  end if;
  if the_lot.grade <> the_line.grade then
    raise exception 'Lot % grade %, baris ini minta grade %', the_lot.lot_code, the_lot.grade, the_line.grade;
  end if;
  if the_lot.best_before is not null and the_lot.best_before < public.pf_today() then
    raise exception 'Lot % sudah lewat batas simpan', the_lot.lot_code;
  end if;
  if kg > the_lot.remaining_kg then
    raise exception 'Lot % hanya tersisa % kg', the_lot.lot_code, the_lot.remaining_kg;
  end if;
  select coalesce(sum(a.qty_kg), 0) into taken from public.pf_so_allocation a where a.so_line_id = line;
  if taken + kg > the_line.qty_kg then
    raise exception 'Melebihi jumlah pesanan: baris ini % kg, sudah terpilih % kg', the_line.qty_kg, taken;
  end if;
  update public.pf_harvest_lot h set remaining_kg = h.remaining_kg - kg where h.id = lot;
  insert into public.pf_so_allocation (so_line_id, harvest_lot_id, qty_kg) values (line, lot, kg) returning id into saved;
  return saved;
end;
$$;

create or replace function public.pf_allocation_release(allocation uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  the_row public.pf_so_allocation;
begin
  perform public.pf_require_seller();
  select * into the_row from public.pf_so_allocation a where a.id = allocation for update;
  if not found then
    raise exception 'Alokasi tidak ditemukan';
  end if;
  if the_row.delivery_id is not null then
    raise exception 'Lot ini sudah dikirim. Batalkan pengirimannya dulu.';
  end if;
  update public.pf_harvest_lot h set remaining_kg = h.remaining_kg + the_row.qty_kg where h.id = the_row.harvest_lot_id;
  delete from public.pf_so_allocation a where a.id = allocation;
end;
$$;

-- 10. Delivery ------------------------------------------------------------------

create or replace function public.pf_delivery_create(target uuid, allocations uuid[], delivered date, new_recipient text, new_notes text default '')
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_order public.pf_sales_order;
  saved uuid;
  matched integer;
begin
  perform public.pf_require_seller();
  current_order := public.pf_order_lock(target);
  if current_order.status <> 'dikonfirmasi' then
    raise exception 'Pesanan ini belum dikonfirmasi atau sudah dibatalkan';
  end if;
  if coalesce(cardinality(allocations), 0) = 0 then
    raise exception 'Pilih minimal satu lot untuk dikirim';
  end if;
  if delivered is null or delivered > public.pf_today() then
    raise exception 'Tanggal kirim tidak boleh di masa depan';
  end if;
  if delivered < current_order.ordered_on then
    raise exception 'Tanggal kirim sebelum tanggal pesanan';
  end if;
  select count(*) into matched
    from public.pf_so_allocation a join public.pf_so_line l on l.id = a.so_line_id
   where a.id = any (allocations) and l.sales_order_id = target and a.delivery_id is null;
  if matched <> cardinality(allocations) then
    raise exception 'Ada lot yang bukan milik pesanan ini atau sudah dikirim';
  end if;
  insert into public.pf_delivery (delivery_no, sales_order_id, delivered_on, recipient, notes)
  values (public.pf_next_doc_no('SJ', delivered), target, delivered, trim(coalesce(new_recipient, '')), trim(coalesce(new_notes, '')))
  returning id into saved;
  update public.pf_so_allocation a set delivery_id = saved where a.id = any (allocations);
  return saved;
end;
$$;

create or replace function public.pf_delivery_cancel(delivery uuid, why text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  the_row public.pf_delivery;
begin
  perform public.pf_require_seller();
  if coalesce(trim(why), '') = '' then
    raise exception 'Alasan wajib diisi';
  end if;
  select * into the_row from public.pf_delivery d where d.id = delivery for update;
  if not found or the_row.cancelled_at is not null then
    raise exception 'Pengiriman tidak ditemukan atau sudah dibatalkan';
  end if;
  perform public.pf_order_lock(the_row.sales_order_id);
  -- What is invoiced must stay delivered.
  if exists (
    select 1 from public.pf_order_line_overview v
     where v.sales_order_id = the_row.sales_order_id
       and v.invoiced_kg > v.delivered_kg - coalesce((
         select sum(a.qty_kg) from public.pf_so_allocation a where a.so_line_id = v.id and a.delivery_id = delivery
       ), 0)
  ) then
    raise exception 'Pengiriman ini sudah ditagih. Batalkan invoice-nya dulu.';
  end if;
  update public.pf_so_allocation a set delivery_id = null where a.delivery_id = delivery;
  update public.pf_delivery d set cancelled_at = now(), cancel_note = trim(why) where d.id = delivery;
end;
$$;

-- 11. Invoices and payments -----------------------------------------------------

-- Bills what has been delivered and not yet billed, at each line's price.
create or replace function public.pf_invoice_issue(target uuid, issued date, due date, rate uuid default null, new_notes text default '')
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_order public.pf_sales_order;
  the_rate public.pf_tax_rate;
  saved uuid;
  item record;
  line_amount numeric;
  sum_amount numeric := 0;
  tax numeric := 0;
  lots text;
  billed boolean := false;
begin
  perform public.pf_require_seller();
  current_order := public.pf_order_lock(target);
  if current_order.status <> 'dikonfirmasi' then
    raise exception 'Pesanan ini belum dikonfirmasi atau sudah dibatalkan';
  end if;
  if issued is null or due is null or due < issued then
    raise exception 'Tanggal jatuh tempo sebelum tanggal invoice';
  end if;
  if rate is not null then
    select * into the_rate from public.pf_tax_rate r where r.id = rate and r.active;
    if not found then
      raise exception 'Tarif pajak tidak aktif';
    end if;
  end if;
  insert into public.pf_invoice (invoice_no, sales_order_id, issued_on, due_on, subtotal, tax_rate_id, tax_name, tax_percent, tax_amount, total, notes)
  values (public.pf_next_doc_no('INV', issued), target, issued, due, 0, rate, coalesce(the_rate.name, ''), coalesce(the_rate.percent, 0), 0, 0, trim(coalesce(new_notes, '')))
  returning id into saved;
  for item in
    select v.id, v.crop_name, v.crop_variety, v.grade, v.price_per_kg, v.delivered_kg - v.invoiced_kg as open_kg
      from public.pf_order_line_overview v
     where v.sales_order_id = target and v.delivered_kg > v.invoiced_kg
  loop
    select string_agg(distinct h.lot_code, ', ') into lots
      from public.pf_so_allocation a join public.pf_harvest_lot h on h.id = a.harvest_lot_id
     where a.so_line_id = item.id and a.delivery_id is not null;
    line_amount := round(item.open_kg * item.price_per_kg);
    insert into public.pf_invoice_line (invoice_id, so_line_id, description, qty_kg, price_per_kg, amount)
    values (saved, item.id, trim(item.crop_name || ' ' || item.crop_variety) || ', grade ' || item.grade || ' (lot ' || lots || ')', item.open_kg, item.price_per_kg, line_amount);
    sum_amount := sum_amount + line_amount;
    billed := true;
  end loop;
  if not billed then
    raise exception 'Belum ada kiriman yang bisa ditagih';
  end if;
  tax := round(sum_amount * coalesce(the_rate.percent, 0) / 100);
  update public.pf_invoice i set subtotal = sum_amount, tax_amount = tax, total = sum_amount + tax where i.id = saved;
  return saved;
end;
$$;

create or replace function public.pf_invoice_void(invoice uuid, why text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  the_row public.pf_invoice;
begin
  perform public.pf_require_seller();
  if coalesce(trim(why), '') = '' then
    raise exception 'Alasan wajib diisi';
  end if;
  select * into the_row from public.pf_invoice i where i.id = invoice for update;
  if not found or the_row.status <> 'terbit' then
    raise exception 'Invoice tidak ditemukan atau sudah dibatalkan';
  end if;
  if exists (select 1 from public.pf_payment p where p.invoice_id = invoice and p.voided_at is null) then
    raise exception 'Invoice sudah ada pembayaran. Batalkan pembayarannya dulu.';
  end if;
  update public.pf_invoice i set status = 'batal', void_note = trim(why) where i.id = invoice;
end;
$$;

create or replace function public.pf_payment_add(invoice uuid, paid date, new_amount numeric, new_method text, new_reference text default '')
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  the_row public.pf_invoice;
  already numeric;
  saved uuid;
begin
  perform public.pf_require_seller();
  select * into the_row from public.pf_invoice i where i.id = invoice for update;
  if not found or the_row.status <> 'terbit' then
    raise exception 'Invoice tidak ditemukan atau sudah dibatalkan';
  end if;
  if paid is null or paid > public.pf_today() then
    raise exception 'Tanggal bayar tidak boleh di masa depan';
  end if;
  if new_amount is null or new_amount <= 0 then
    raise exception 'Jumlah bayar harus lebih dari 0';
  end if;
  select coalesce(sum(p.amount), 0) into already from public.pf_payment p where p.invoice_id = invoice and p.voided_at is null;
  if already + new_amount > the_row.total then
    raise exception 'Melebihi sisa tagihan: sisa %', the_row.total - already;
  end if;
  insert into public.pf_payment (invoice_id, paid_on, amount, method, reference)
  values (invoice, paid, new_amount, new_method, trim(coalesce(new_reference, '')))
  returning id into saved;
  return saved;
end;
$$;

create or replace function public.pf_payment_void(payment uuid, why text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.pf_require_seller();
  if coalesce(trim(why), '') = '' then
    raise exception 'Alasan wajib diisi';
  end if;
  update public.pf_payment p set voided_at = now(), void_note = trim(why) where p.id = payment and p.voided_at is null;
  if not found then
    raise exception 'Pembayaran tidak ditemukan atau sudah dibatalkan';
  end if;
end;
$$;

-- 12. Trace ---------------------------------------------------------------------

-- One flat answer from any end of the chain: an order, harvest lot, batch or seed lot
-- number gives every row touching it, so a recall reads the same as a customer's question.
create or replace function public.pf_trace(code text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  wanted text := upper(trim(coalesce(code, '')));
  rows jsonb;
begin
  if not public.pf_can_read_sales() then
    raise exception 'Akun Anda tidak punya izin untuk tindakan ini.' using errcode = '42501';
  end if;
  if wanted = '' then
    return '[]'::jsonb;
  end if;
  select coalesce(jsonb_agg(to_jsonb(t) order by t.harvested_at desc, t.lot_code, t.so_no), '[]'::jsonb) into rows
    from (
      select
        o.id as order_id, o.so_no, p.name as partner_name, a.qty_kg as allocated_kg,
        d.delivery_no, d.delivered_on,
        h.lot_code, h.grade, h.harvested_at, h.fresh_kg, h.best_before,
        b.id as batch_id, b.code as batch_code, b.status as batch_status, b.sown_at,
        (select min(s.placed_at) from public.pf_batch_slot s where s.batch_id = b.id and s.kind = 'hole') as transplanted_at,
        r.code as recipe_code, r.version as recipe_version,
        c.name as crop_name, c.variety as crop_variety,
        l.lot_no as seed_lot_no, l.supplier as seed_supplier
      from public.pf_harvest_lot h
      join public.pf_batch b on b.id = h.batch_id
      join public.pf_recipe r on r.id = b.recipe_id
      join public.pf_crop c on c.id = r.crop_id
      join public.pf_stock_lot l on l.id = b.seed_lot_id
      left join public.pf_so_allocation a on a.harvest_lot_id = h.id
      left join public.pf_so_line sl on sl.id = a.so_line_id
      left join public.pf_sales_order o on o.id = sl.sales_order_id
      left join public.pf_partner p on p.id = o.partner_id
      left join public.pf_delivery d on d.id = a.delivery_id
      where upper(h.lot_code) = wanted or upper(b.code) = wanted or upper(l.lot_no) = wanted or upper(coalesce(o.so_no, '')) = wanted
    ) t;
  return rows;
end;
$$;

-- 13. Who may call what ---------------------------------------------------------

do $$
declare
  fn text;
begin
  foreach fn in array array[
    'pf_require_seller()',
    'pf_next_doc_no(text, date)',
    'pf_order_lock(uuid)'
  ] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', fn);
  end loop;
  foreach fn in array array[
    'pf_can_sell()',
    'pf_can_read_sales()',
    'pf_partner_save(uuid, text, text, text, text, text, text, text, text, boolean)',
    'pf_tax_rate_save(uuid, text, numeric, date, boolean)',
    'pf_order_save(uuid, uuid, date, date, text, jsonb)',
    'pf_order_confirm(uuid)',
    'pf_order_cancel(uuid, text)',
    'pf_allocate(uuid, uuid, numeric)',
    'pf_allocation_release(uuid)',
    'pf_delivery_create(uuid, uuid[], date, text, text)',
    'pf_delivery_cancel(uuid, text)',
    'pf_invoice_issue(uuid, date, date, uuid, text)',
    'pf_invoice_void(uuid, text)',
    'pf_payment_add(uuid, date, numeric, text, text)',
    'pf_payment_void(uuid, text)',
    'pf_trace(text)'
  ] loop
    execute format('revoke all on function public.%s from public, anon', fn);
    execute format('grant execute on function public.%s to authenticated', fn);
  end loop;
end;
$$;

-- 14. Audit ---------------------------------------------------------------------

do $$
declare
  audited text;
begin
  foreach audited in array array['pf_partner', 'pf_tax_rate', 'pf_sales_order', 'pf_so_allocation', 'pf_delivery', 'pf_invoice', 'pf_payment'] loop
    execute format('drop trigger if exists pf_audit on public.%I', audited);
    execute format(
      'create trigger pf_audit after insert or update or delete on public.%I for each row execute function public.pf_audit()',
      audited
    );
  end loop;
end;
$$;

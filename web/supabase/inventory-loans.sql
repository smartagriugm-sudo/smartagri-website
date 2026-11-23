-- PUAPT inventory: instrument data entry, bookings, loans and rentals.
-- Run once in the Supabase SQL editor after inventory.sql, the inventory
-- batch files and accounts.sql. Safe to run again (idempotent).
--
-- What it adds:
--   1. usage_logs columns for contact, the signed-in requester, payment and
--      the new statuses `booked` (reserved for later) and `cancelled`.
--   2. One open loan per instrument, enforced by the database.
--   3. RPCs that do each step in one transaction (book, check out, return,
--      cancel, set status, mark payment, save an instrument), so two people
--      cannot check out the same instrument at once and the instrument status
--      always follows the logbook.
--   4. Tighter RLS: every active lab member reads and uses the inventory
--      through the RPCs; only lab admins add or edit instruments and correct
--      logbook entries.
--   5. A public `instrument-photos` bucket for photos uploaded from the form.

-- 1. Columns ----------------------------------------------------------------
alter table public.usage_logs add column if not exists borrower_contact text;   -- phone or email for follow-up
alter table public.usage_logs add column if not exists borrower_id      uuid references auth.users (id) on delete set null;
alter table public.usage_logs add column if not exists payment_status   text;   -- null (no charge) | unpaid | paid | waived
alter table public.usage_logs add column if not exists cancelled_at     timestamptz;
alter table public.usage_logs add column if not exists updated_at       timestamptz;

alter table public.instruments add column if not exists updated_at timestamptz;
-- Billing rules from the WGFS 1.2 rate letter (filled by inventory-wgfs-tariff.sql).
alter table public.instruments add column if not exists spec         text;    -- what it does
alter table public.instruments add column if not exists terms        text;    -- letter notes per instrument
alter table public.instruments add column if not exists min_quantity numeric; -- minimum billed per request
alter table public.instruments add column if not exists rate_tiers   jsonb;   -- [{"from":21,"internal_tech":60000,"external":95000}, ...]

-- Checks are NOT VALID: they hold for every new or changed row without
-- failing on older rows typed in by hand.
alter table public.usage_logs drop constraint if exists usage_logs_status_check;
alter table public.usage_logs add constraint usage_logs_status_check
  check (status in ('booked', 'ongoing', 'returned', 'cancelled')) not valid;
alter table public.usage_logs drop constraint if exists usage_logs_payment_check;
alter table public.usage_logs add constraint usage_logs_payment_check
  check (payment_status is null or payment_status in ('unpaid', 'paid', 'waived')) not valid;
alter table public.usage_logs drop constraint if exists usage_logs_dates_check;
alter table public.usage_logs add constraint usage_logs_dates_check
  check (expected_return is null or expected_return >= checkout_at) not valid;
alter table public.usage_logs drop constraint if exists usage_logs_quantity_check;
alter table public.usage_logs add constraint usage_logs_quantity_check
  check (quantity is null or quantity >= 0) not valid;

alter table public.instruments drop constraint if exists instruments_status_check;
alter table public.instruments add constraint instruments_status_check
  check (status in ('available', 'in_use', 'maintenance', 'calibration', 'broken')) not valid;
alter table public.instruments drop constraint if exists instruments_rates_check;
alter table public.instruments add constraint instruments_rates_check
  check (coalesce(rate_internal_self, 0) >= 0 and coalesce(rate_internal_tech, 0) >= 0 and coalesce(rate_external, 0) >= 0) not valid;

create index if not exists usage_logs_booked_idx on public.usage_logs (instrument_id, checkout_at)
  where status = 'booked';

-- 2. One open loan per instrument -----------------------------------------------
-- If older data already has two open loans on one instrument the index is
-- skipped with a notice; close the extra one and run the file again.
do $$
begin
  if exists (
    select instrument_id from public.usage_logs
     where status = 'ongoing' and log_type is distinct from 'check'
     group by instrument_id having count(*) > 1
  ) then
    raise notice 'Some instruments have more than one ongoing loan; usage_logs_one_open_loan was not created.';
  else
    create unique index if not exists usage_logs_one_open_loan on public.usage_logs (instrument_id)
      where status = 'ongoing' and log_type is distinct from 'check';
  end if;
end;
$$;

-- 3. RPCs -------------------------------------------------------------------------

-- Charge for one request, as the rate letter sets it: the quantity is raised
-- to the minimum per request, then each tier prices its own range (for the
-- F-750: samples 1-20 at the listed rate, 21-100 and 101+ cheaper). Same
-- rule as chargeFor() in src/lib/inventory.ts.
create or replace function public.inventory_charge(base numeric, rtype text, qty numeric, min_qty numeric, tiers jsonb)
returns numeric
language plpgsql immutable set search_path = public
as $$
declare
  billed numeric;
  rate   numeric := base;
  done   numeric := 0;
  upto   numeric;
  total  numeric := 0;
  t      jsonb;
begin
  if qty is null or base is null or qty < 0 then
    return null;
  end if;
  billed := greatest(qty, coalesce(min_qty, 0));
  for t in
    select value from jsonb_array_elements(coalesce(tiers, '[]'::jsonb))
     where (value->>'from')::numeric > 1
     order by (value->>'from')::numeric
  loop
    upto := least(billed, (t->>'from')::numeric - 1);
    if upto > done then
      total := total + (upto - done) * rate;
      done := upto;
    end if;
    if t ? rtype and t->>rtype is not null then
      rate := (t->>rtype)::numeric;
    end if;
  end loop;
  if billed > done then
    total := total + (billed - done) * rate;
  end if;
  return total;
end;
$$;
-- All run as the definer so the instrument status and the logbook change
-- together; each one checks who is calling first.

create or replace function public.inventory_require_member()
returns void
language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.is_lab_member() then
    raise exception 'Only active lab members can use the inventory.' using errcode = '42501';
  end if;
end;
$$;

create or replace function public.inventory_require_admin()
returns void
language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.is_lab_admin() then
    raise exception 'Only lab admins can change instrument data.' using errcode = '42501';
  end if;
end;
$$;

-- Raises when [starts, ends) overlaps a booking or loan on the instrument.
create or replace function public.inventory_check_free(inst uuid, starts timestamptz, ends timestamptz, skip uuid)
returns void
language plpgsql stable security definer set search_path = public
as $$
declare
  clash record;
begin
  select borrower_name, checkout_at, expected_return, status into clash
    from public.usage_logs
   where instrument_id = inst
     and id is distinct from skip
     and log_type is distinct from 'check'
     and status in ('booked', 'ongoing')
     and checkout_at < ends
     and coalesce(expected_return, 'infinity'::timestamptz) > starts
   order by checkout_at
   limit 1;
  if found then
    raise exception 'Clashes with % by % from % to %.',
      case when clash.status = 'booked' then 'a booking' else 'a loan' end,
      clash.borrower_name,
      to_char(clash.checkout_at at time zone 'Asia/Jakarta', 'DD Mon YYYY HH24:MI'),
      coalesce(to_char(clash.expected_return at time zone 'Asia/Jakarta', 'DD Mon YYYY HH24:MI'), 'open end')
      using errcode = 'P0001';
  end if;
end;
$$;

-- `entry` is a JSON object with the loan fields (see lib/inventory-data.ts).
-- mode 'book' reserves a future slot; mode 'checkout' hands it out now (or at
-- the given past start, for a loan recorded late).
create or replace function public.inventory_request(p_inst uuid, p_mode text, p_entry jsonb)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  i public.instruments;
  starts timestamptz := coalesce((p_entry->>'checkout_at')::timestamptz, now());
  ends   timestamptz := (p_entry->>'expected_return')::timestamptz;
  qty    numeric := (p_entry->>'quantity')::numeric;
  rate   numeric;
  rtype  text;
  utype  text := coalesce(p_entry->>'user_type', 'internal');
  op     text := coalesce(p_entry->>'operator', 'self');
  v_cost numeric;
  new_id uuid;
begin
  perform public.inventory_require_member();
  if p_mode not in ('book', 'checkout') then
    raise exception 'Unknown request type.';
  end if;
  select * into i from public.instruments where id = p_inst for update;
  if not found then
    raise exception 'Instrument not found.';
  end if;
  if i.kind = 'installed' then
    raise exception 'Installed instruments are not lent out; log an inspection instead.';
  end if;
  if nullif(trim(p_entry->>'borrower_name'), '') is null then
    raise exception 'Borrower name is required.';
  end if;
  if ends is null then
    raise exception 'Return date is required.';
  end if;
  if ends <= starts then
    raise exception 'The return date must be after the start.';
  end if;
  if qty is not null and qty < 0 then
    raise exception 'Quantity cannot be negative.';
  end if;
  if utype not in ('internal', 'external') or op not in ('self', 'technician') then
    raise exception 'Unknown user type or operator.';
  end if;

  if p_mode = 'book' then
    if starts < now() - interval '5 minutes' then
      raise exception 'A booking must start in the future; use check out for a loan that has started.';
    end if;
  else
    if starts > now() + interval '5 minutes' then
      raise exception 'A checkout cannot start in the future; book it instead.';
    end if;
    if i.status <> 'available' then
      raise exception 'This instrument is % and cannot be checked out.', replace(i.status, '_', ' ');
    end if;
  end if;
  perform public.inventory_check_free(p_inst, starts, ends, null);

  -- The rate comes from the instrument, never from the browser.
  if utype = 'external' then
    rtype := 'external'; rate := i.rate_external; op := coalesce(nullif(op, ''), 'self');
  elsif op = 'technician' then
    rtype := 'internal_tech'; rate := i.rate_internal_tech;
  else
    rtype := 'internal_self'; rate := i.rate_internal_self;
  end if;
  v_cost := public.inventory_charge(rate, rtype, qty, i.min_quantity, i.rate_tiers);

  insert into public.usage_logs (
    instrument_id, log_type, status, borrower_name, borrower_org, borrower_contact, borrower_id,
    user_type, operator, technician_name, purpose, checkout_at, expected_return,
    quantity, unit, rate_type, unit_rate, cost, payment_status, condition_out, notes, created_by
  ) values (
    p_inst, 'borrow', case when p_mode = 'book' then 'booked' else 'ongoing' end,
    trim(p_entry->>'borrower_name'), nullif(trim(p_entry->>'borrower_org'), ''),
    nullif(trim(p_entry->>'borrower_contact'), ''), auth.uid(),
    utype, op, case when op = 'technician' then nullif(trim(p_entry->>'technician_name'), '') end,
    nullif(trim(p_entry->>'purpose'), ''), starts, ends,
    qty, i.unit, rtype, rate, v_cost,
    case when coalesce(v_cost, 0) > 0 then 'unpaid' end,
    nullif(trim(p_entry->>'condition_out'), ''), nullif(trim(p_entry->>'notes'), ''), auth.uid()
  ) returning id into new_id;

  if p_mode = 'checkout' then
    update public.instruments set status = 'in_use', updated_at = now() where id = p_inst;
  end if;
  return new_id;
end;
$$;

-- Hand out a booked slot: the booking becomes the ongoing loan.
create or replace function public.inventory_start_booking(p_log uuid, p_condition text)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  l public.usage_logs;
  i public.instruments;
begin
  perform public.inventory_require_member();
  select * into l from public.usage_logs where id = p_log for update;
  if not found or l.status <> 'booked' then
    raise exception 'This booking is no longer open.';
  end if;
  select * into i from public.instruments where id = l.instrument_id for update;
  if i.status <> 'available' then
    raise exception 'This instrument is % and cannot be handed out yet.', replace(i.status, '_', ' ');
  end if;
  perform public.inventory_check_free(l.instrument_id, least(now(), l.checkout_at), l.expected_return, l.id);
  update public.usage_logs
     set status = 'ongoing', checkout_at = least(now(), l.checkout_at),
         condition_out = coalesce(nullif(trim(p_condition), ''), l.condition_out), updated_at = now()
   where id = p_log;
  update public.instruments set status = 'in_use', updated_at = now() where id = l.instrument_id;
end;
$$;

-- Close a loan. `after` is the instrument status once it is back
-- (available, maintenance or broken), chosen from the return condition.
create or replace function public.inventory_return(p_log uuid, p_qty numeric, p_condition text, p_notes text, p_after text, p_payment text)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  l public.usage_logs;
  i public.instruments;
  v_cost numeric;
begin
  perform public.inventory_require_member();
  select * into l from public.usage_logs where id = p_log for update;
  select * into i from public.instruments where id = l.instrument_id;
  if not found or l.status <> 'ongoing' then
    raise exception 'This loan is not open.';
  end if;
  if p_after not in ('available', 'maintenance', 'calibration', 'broken') then
    raise exception 'Unknown instrument status.';
  end if;
  if p_qty is not null and p_qty < 0 then
    raise exception 'Quantity cannot be negative.';
  end if;
  if p_payment is not null and p_payment not in ('unpaid', 'paid', 'waived') then
    raise exception 'Unknown payment status.';
  end if;
  -- The rate agreed at checkout, with the instrument's minimum and tiers.
  v_cost := public.inventory_charge(l.unit_rate, l.rate_type, p_qty, i.min_quantity, i.rate_tiers);
  update public.usage_logs
     set status = 'returned', returned_at = now(), quantity = p_qty, cost = v_cost,
         condition_in = nullif(trim(p_condition), ''), notes = nullif(trim(p_notes), ''),
         payment_status = case when coalesce(v_cost, 0) > 0 then coalesce(p_payment, 'unpaid') end,
         updated_at = now()
   where id = p_log;
  update public.instruments set status = p_after, updated_at = now() where id = l.instrument_id;
end;
$$;

-- Cancel a booking (its requester or an admin).
create or replace function public.inventory_cancel(p_log uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  l public.usage_logs;
begin
  perform public.inventory_require_member();
  select * into l from public.usage_logs where id = p_log for update;
  if not found or l.status <> 'booked' then
    raise exception 'Only an open booking can be cancelled.';
  end if;
  if l.created_by is distinct from auth.uid() and not public.is_lab_admin() then
    raise exception 'Only the person who booked it or a lab admin can cancel this booking.' using errcode = '42501';
  end if;
  update public.usage_logs set status = 'cancelled', cancelled_at = now(), updated_at = now() where id = p_log;
end;
$$;

-- Maintenance, calibration, out of service, back to available. `in_use`
-- follows the logbook and is never set by hand.
create or replace function public.inventory_set_status(p_inst uuid, p_status text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  perform public.inventory_require_member();
  if p_status not in ('available', 'maintenance', 'calibration', 'broken') then
    raise exception 'Unknown instrument status.';
  end if;
  if exists (select 1 from public.usage_logs where instrument_id = p_inst and status = 'ongoing' and log_type is distinct from 'check') then
    raise exception 'This instrument is checked out; return it first.';
  end if;
  update public.instruments set status = p_status, updated_at = now() where id = p_inst;
  if not found then
    raise exception 'Instrument not found.';
  end if;
end;
$$;

create or replace function public.inventory_set_payment(p_log uuid, p_payment text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  perform public.inventory_require_admin();
  if p_payment not in ('unpaid', 'paid', 'waived') then
    raise exception 'Unknown payment status.';
  end if;
  update public.usage_logs set payment_status = p_payment, updated_at = now() where id = p_log and coalesce(cost, 0) > 0;
  if not found then
    raise exception 'This entry has no charge to settle.';
  end if;
end;
$$;

-- Add (inst null) or edit an instrument. Returns its slug.
create or replace function public.inventory_save_instrument(p_inst uuid, p_data jsonb)
returns text
language plpgsql security definer set search_path = public
as $$
declare
  new_slug text := lower(trim(p_data->>'slug'));
  out_slug text;
begin
  perform public.inventory_require_admin();
  if nullif(trim(p_data->>'code'), '') is null or nullif(trim(p_data->>'name'), '') is null then
    raise exception 'Code and name are required.';
  end if;
  if coalesce(p_data->>'kind', 'portable') not in ('portable', 'installed') then
    raise exception 'Unknown instrument type.';
  end if;
  if new_slug is null or new_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception 'The address name may only hold lowercase letters, digits and dashes.';
  end if;
  if exists (select 1 from public.instruments where slug = new_slug and id is distinct from p_inst) then
    raise exception 'Another instrument already uses the address %.', new_slug;
  end if;

  if p_inst is null then
    insert into public.instruments (
      ord, slug, code, name, brand, lab, category, kind, unit,
      rate_internal_self, rate_internal_tech, rate_external, pic, notes, photo, status,
      spec, terms, min_quantity
    ) values (
      (select coalesce(max(ord), 0) + 1 from public.instruments),
      new_slug, trim(p_data->>'code'), trim(p_data->>'name'),
      nullif(trim(p_data->>'brand'), ''), nullif(trim(p_data->>'lab'), ''), nullif(trim(p_data->>'category'), ''),
      coalesce(p_data->>'kind', 'portable'), nullif(trim(p_data->>'unit'), ''),
      (p_data->>'rate_internal_self')::numeric, (p_data->>'rate_internal_tech')::numeric, (p_data->>'rate_external')::numeric,
      nullif(trim(p_data->>'pic'), ''), nullif(trim(p_data->>'notes'), ''), nullif(trim(p_data->>'photo'), ''),
      'available',
      nullif(trim(p_data->>'spec'), ''), nullif(trim(p_data->>'terms'), ''), (p_data->>'min_quantity')::numeric
    ) returning slug into out_slug;
  else
    update public.instruments set
      slug = new_slug, code = trim(p_data->>'code'), name = trim(p_data->>'name'),
      brand = nullif(trim(p_data->>'brand'), ''), lab = nullif(trim(p_data->>'lab'), ''),
      category = nullif(trim(p_data->>'category'), ''), kind = coalesce(p_data->>'kind', 'portable'),
      unit = nullif(trim(p_data->>'unit'), ''),
      rate_internal_self = (p_data->>'rate_internal_self')::numeric,
      rate_internal_tech = (p_data->>'rate_internal_tech')::numeric,
      rate_external = (p_data->>'rate_external')::numeric,
      pic = nullif(trim(p_data->>'pic'), ''), notes = nullif(trim(p_data->>'notes'), ''),
      photo = nullif(trim(p_data->>'photo'), ''),
      spec = nullif(trim(p_data->>'spec'), ''), terms = nullif(trim(p_data->>'terms'), ''),
      min_quantity = (p_data->>'min_quantity')::numeric,
      -- rate_tiers is only changed in SQL (see inventory-wgfs-tariff.sql).
      updated_at = now()
    where id = p_inst
    returning slug into out_slug;
    if out_slug is null then
      raise exception 'Instrument not found.';
    end if;
  end if;
  return out_slug;
end;
$$;

do $$
declare
  f text;
begin
  foreach f in array array[
    'inventory_require_member()', 'inventory_require_admin()',
    'inventory_check_free(uuid, timestamptz, timestamptz, uuid)',
    'inventory_request(uuid, text, jsonb)', 'inventory_start_booking(uuid, text)',
    'inventory_return(uuid, numeric, text, text, text, text)', 'inventory_cancel(uuid)',
    'inventory_set_status(uuid, text)', 'inventory_set_payment(uuid, text)',
    'inventory_save_instrument(uuid, jsonb)'
  ] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end;
$$;

-- 4. Row level security -----------------------------------------------------------
-- Reading stays open to every active member. Writes go through the RPCs
-- above; the direct-table rules that remain are:
--   instruments: admins only (the RPC checks the same).
--   usage_logs:  members insert inspection checks in their own name;
--                admins update or delete any entry to correct mistakes.
drop policy if exists "authenticated write instruments" on public.instruments;
drop policy if exists "inventory admins write instruments" on public.instruments;
create policy "inventory admins write instruments" on public.instruments
  for all to authenticated using (public.is_lab_admin()) with check (public.is_lab_admin());

drop policy if exists "authenticated write logs" on public.usage_logs;
drop policy if exists "inventory members log checks" on public.usage_logs;
create policy "inventory members log checks" on public.usage_logs
  for insert to authenticated
  with check (public.is_lab_member() and log_type = 'check' and created_by = auth.uid());
drop policy if exists "inventory admins fix logs" on public.usage_logs;
create policy "inventory admins fix logs" on public.usage_logs
  for update to authenticated using (public.is_lab_admin()) with check (public.is_lab_admin());
drop policy if exists "inventory admins delete logs" on public.usage_logs;
create policy "inventory admins delete logs" on public.usage_logs
  for delete to authenticated using (public.is_lab_admin());

-- 5. Photo bucket -----------------------------------------------------------------
-- Instrument photos are not private (the seeded ones sit in /brand), so the
-- bucket is public to read; only admins upload or remove.
insert into storage.buckets (id, name, public)
values ('instrument-photos', 'instrument-photos', true)
on conflict (id) do update set public = true;

drop policy if exists "instrument_photos_write_admin" on storage.objects;
create policy "instrument_photos_write_admin"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'instrument-photos' and public.is_lab_admin());

drop policy if exists "instrument_photos_remove_admin" on storage.objects;
create policy "instrument_photos_remove_admin"
  on storage.objects for delete to authenticated
  using (bucket_id = 'instrument-photos' and public.is_lab_admin());

-- Product photos and fuller staff profiles for the ERP. Run manually in the Supabase
-- SQL editor after pf-hr.sql and pf-inventory.sql. Safe to run again.
--
-- Photos live in the private pf-media bucket: lab members read them through signed
-- links, and production managers upload them. Staff photos are not stored here: a
-- person with a login shows their account's avatar.

-- 1. Columns -------------------------------------------------------------------

alter table public.pf_item add column if not exists photo_path text;
alter table public.pf_person add column if not exists email text not null default '';
alter table public.pf_person add column if not exists address text not null default '';
alter table public.pf_person add column if not exists emergency_contact text not null default '';
alter table public.pf_person add column if not exists skills text not null default '';
alter table public.pf_person add column if not exists notes text not null default '';

-- 2. Views: new columns go last, since a view may only grow at its end ----------

create or replace view public.pf_item_overview with (security_invoker = true) as
select
  i.id, i.sku, i.name, i.category, i.unit, i.crop_id, i.reorder_point, i.track_expiry, i.active, i.notes,
  coalesce(s.usable, 0) as usable_qty,
  coalesce(s.expired, 0) as expired_qty,
  coalesce(s.lots, 0)::integer as lots,
  s.next_expiry,
  (i.reorder_point is not null and coalesce(s.usable, 0) <= i.reorder_point) as below_reorder,
  (select max(c.counted_on) from public.pf_stock_count c join public.pf_stock_count_line cl on cl.count_id = c.id
    join public.pf_stock_lot l on l.id = cl.lot_id where l.item_id = i.id) as last_counted_on,
  i.photo_path
from public.pf_item i
left join lateral (
  select
    sum(l.qty_on_hand) filter (where l.expiry_date is null or l.expiry_date >= public.pf_today()) as usable,
    sum(l.qty_on_hand) filter (where l.expiry_date < public.pf_today()) as expired,
    count(*) filter (where l.qty_on_hand > 0) as lots,
    min(l.expiry_date) filter (where l.qty_on_hand > 0 and l.expiry_date >= public.pf_today()) as next_expiry
  from public.pf_stock_lot l where l.item_id = i.id
) s on true;

create or replace view public.pf_person_overview with (security_invoker = true) as
select
  p.id, p.profile_id, p.full_name, p.person_type, p.supervisor_id, p.phone, p.joined_on, p.left_on, p.status,
  s.full_name as supervisor_name,
  p.profile_id is not null as has_account,
  p.email, p.address, p.emergency_contact, p.skills, p.notes
from public.pf_person p
left join public.pf_person s on s.id = p.supervisor_id;

-- 3. Writes --------------------------------------------------------------------

create or replace function public.pf_item_photo_set(item uuid, path text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  perform public.pf_require(public.pf_can_manage_production());
  update public.pf_item set photo_path = nullif(trim(coalesce(path, '')), '') where id = item;
  if not found then
    raise exception 'Item not found';
  end if;
end;
$$;

create or replace function public.pf_person_details_save(target uuid, new_email text, new_address text, new_emergency text, new_skills text, new_notes text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  perform public.pf_require(public.pf_can_manage_people());
  update public.pf_person
  set email = trim(coalesce(new_email, '')), address = trim(coalesce(new_address, '')),
      emergency_contact = trim(coalesce(new_emergency, '')), skills = trim(coalesce(new_skills, '')), notes = trim(coalesce(new_notes, ''))
  where id = target;
  if not found then
    raise exception 'Person not found';
  end if;
end;
$$;

revoke all on function public.pf_item_photo_set(uuid, text) from public, anon;
grant execute on function public.pf_item_photo_set(uuid, text) to authenticated;
revoke all on function public.pf_person_details_save(uuid, text, text, text, text, text) from public, anon;
grant execute on function public.pf_person_details_save(uuid, text, text, text, text, text) to authenticated;

-- 4. The bucket ----------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('pf-media', 'pf-media', false)
on conflict (id) do update set public = false;

drop policy if exists "pf_media_read_lab_members" on storage.objects;
create policy "pf_media_read_lab_members"
  on storage.objects for select to authenticated
  using (bucket_id = 'pf-media' and public.is_lab_member());

drop policy if exists "pf_media_write_production" on storage.objects;
create policy "pf_media_write_production"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'pf-media' and public.pf_can_manage_production());

drop policy if exists "pf_media_remove_production" on storage.objects;
create policy "pf_media_remove_production"
  on storage.objects for delete to authenticated
  using (bucket_id = 'pf-media' and public.pf_can_manage_production());

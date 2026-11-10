-- Removes everything pf-demo-seed.sql added, and only that. Run manually in the
-- Supabase SQL editor, as one script. Rows are found by their d0000000 id or by
-- hanging off a row that has one, so real records stay. Safe to run again.

begin;
set local statement_timeout = 0;

create or replace function pg_temp.demo(id uuid) returns boolean language sql immutable as $$
  select id::text like 'd0000000-%'
$$;

-- An active recipe normally cannot be deleted: that guard rests only for this script.
alter table public.pf_recipe disable trigger pf_recipe_guard;
alter table public.pf_recipe_phase disable trigger pf_recipe_phase_guard;

/* Bookings, with their times, invitations and answers. Only when pf-booking.sql has run. */
do $$
begin
  if to_regclass('public.pf_booking') is not null then
    delete from public.pf_booking where id::text like 'd0000000-%';
  end if;
end;
$$;

/* Maintenance and running costs. */
delete from public.pf_work_order where pg_temp.demo(id);
delete from public.pf_maintenance_plan where pg_temp.demo(id);
delete from public.pf_cost_entry where pg_temp.demo(id);
delete from public.pf_labor_rate where pg_temp.demo(id);

/* People. */
delete from public.pf_labor_log where pg_temp.demo(id);
delete from public.pf_attendance where pg_temp.demo(id);
delete from public.pf_attendance_consent where pg_temp.demo(person_id);
delete from public.pf_leave where pg_temp.demo(id);
delete from public.pf_shift where pg_temp.demo(id);
delete from public.pf_contract where pg_temp.demo(id);
delete from public.pf_person where pg_temp.demo(id);
delete from public.pf_work_area where pg_temp.demo(id);

/* Sales. */
delete from public.pf_payment where pg_temp.demo(id);
delete from public.pf_invoice_line where pg_temp.demo(id);
delete from public.pf_invoice where pg_temp.demo(id);
delete from public.pf_so_allocation where pg_temp.demo(id);
delete from public.pf_delivery where pg_temp.demo(id);
delete from public.pf_so_line where pg_temp.demo(id);
delete from public.pf_sales_order where pg_temp.demo(id);
delete from public.pf_tax_rate where pg_temp.demo(id);

/* Sensors. A summary is kept when a real device also reports that metric at that place. */
delete from public.pf_alarm where pg_temp.demo(id);
delete from public.pf_alarm_rule where pg_temp.demo(id);
delete from public.pf_reading_latest where pg_temp.demo(asset_id);
delete from public.pf_sensor_reading where pg_temp.demo(asset_id);
delete from public.pf_reading_hourly h
 where exists (select 1 from public.pf_asset a where pg_temp.demo(a.id) and a.location_id = h.location_id and h.metric = any (a.metrics))
   and not exists (select 1 from public.pf_asset a where not pg_temp.demo(a.id) and a.location_id = h.location_id and h.metric = any (a.metrics));
delete from public.pf_ingest_log where pg_temp.demo(asset_id);
delete from public.pf_calibration where pg_temp.demo(id);
delete from public.pf_asset where pg_temp.demo(id);

/* Batches and the stock they moved. */
delete from public.pf_stock_shortage where pg_temp.demo(batch_id);
delete from public.pf_stock_count_line where pg_temp.demo(id);
delete from public.pf_stock_count where pg_temp.demo(id);
delete from public.pf_harvest_lot where pg_temp.demo(id);
delete from public.pf_batch_event where pg_temp.demo(batch_id);
update public.pf_batch_slot set source_slot_id = null where pg_temp.demo(id);
delete from public.pf_batch_slot where pg_temp.demo(id);
delete from public.pf_stock_move where pg_temp.demo(lot_id) or pg_temp.demo(batch_id);
delete from public.pf_batch where pg_temp.demo(id);

/* Purchases, lots, items, partners. */
delete from public.pf_lot_price where pg_temp.demo(id);
delete from public.pf_stock_lot where pg_temp.demo(id);
delete from public.pf_recipe_material where pg_temp.demo(id);
delete from public.pf_po_line where pg_temp.demo(id);
delete from public.pf_purchase_order where pg_temp.demo(id);
delete from public.pf_item where pg_temp.demo(id);
delete from public.pf_partner where pg_temp.demo(id);

/* Recipes and crops. */
delete from public.pf_recipe_target where recipe_id::text like 'd0000000-%';
delete from public.pf_recipe where pg_temp.demo(id);
delete from public.pf_crop where pg_temp.demo(id);

alter table public.pf_recipe enable trigger pf_recipe_guard;
alter table public.pf_recipe_phase enable trigger pf_recipe_phase_guard;

/* The tier the dummy data marked for cleaning. */
update public.pf_location set slot_status = 'available' where level = 'hole' and code like 'R2-T1-%' and slot_status = 'sanitasi';

/* The audit trail of all the above, so the audit page is back to real events. */
delete from public.pf_audit_log
 where row_id like 'd0000000-%' or new_data ->> 'batch_id' like 'd0000000-%' or old_data ->> 'batch_id' like 'd0000000-%' or new_data ->> 'lot_id' like 'd0000000-%' or old_data ->> 'lot_id' like 'd0000000-%';

commit;

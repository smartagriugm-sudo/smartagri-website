-- PUAPT inventory updates (run once in the Supabase SQL editor). Idempotent.

-- 1. Instrument photo column + photos -------------------------------------
alter table public.instruments add column if not exists photo text;

update public.instruments set photo = '/brand/uploads/instruments/wgfs-91-trinity-pro-platform.webp' where slug = 'wgfs-91-trinity-pro-platform';
update public.instruments set photo = '/brand/uploads/instruments/wgfs-91-payload-trinity-pro-sensor-rgb-rx1rii.webp' where slug = 'wgfs-91-payload-trinity-pro-sensor-rgb-rx1rii';
update public.instruments set photo = '/brand/uploads/instruments/wgfs-92-drone-surveillance-striver-pro-complete-set.webp' where slug = 'wgfs-92-drone-surveillance-striver-pro-complete-set';
update public.instruments set photo = '/brand/uploads/instruments/wgfs-93-camera-micasense-red-edge-p.webp' where slug = 'wgfs-93-camera-micasense-red-edge-p';
update public.instruments set photo = '/brand/uploads/instruments/wgfs-94-analisis-data-drone-fotogrametri-agisoft-metashape-p.webp' where slug = 'wgfs-94-analisis-data-drone-fotogrametri-agisoft-metashape-p';
update public.instruments set photo = '/brand/uploads/instruments/wgfs-95-soil-npk-tester-and-supporting-facilities.webp' where slug = 'wgfs-95-soil-npk-tester-and-supporting-facilities';
update public.instruments set photo = '/brand/uploads/instruments/wgfs-102-land-watering-drone-tool.webp' where slug = 'wgfs-102-land-watering-drone-tool';
update public.instruments set photo = '/brand/uploads/instruments/wgfs-103-drone-tool-for-spraying-pesticide.webp' where slug = 'wgfs-103-drone-tool-for-spraying-pesticide';
update public.instruments set photo = '/brand/uploads/instruments/wgfs-104-porometer-fluorometers.webp' where slug = 'wgfs-104-porometer-fluorometers';
update public.instruments set photo = '/brand/uploads/instruments/wgfs-105-chlorophyll-meter.webp' where slug = 'wgfs-105-chlorophyll-meter';
update public.instruments set photo = '/brand/uploads/instruments/wgfs-106-produce-quality-meter.webp' where slug = 'wgfs-106-produce-quality-meter';
update public.instruments set photo = '/brand/uploads/instruments/wgfs-107-gas-analyzer.webp' where slug = 'wgfs-107-gas-analyzer';
update public.instruments set photo = '/brand/uploads/instruments/wgfs-108-plant-growth-chamber.webp' where slug = 'wgfs-108-plant-growth-chamber';
update public.instruments set photo = '/brand/uploads/instruments/wgfs-109-hyperspectral-imaging-system.webp' where slug = 'wgfs-109-hyperspectral-imaging-system';
update public.instruments set photo = '/brand/uploads/instruments/wgfs-116-portable-photosynthesis-system.webp' where slug = 'wgfs-116-portable-photosynthesis-system';
update public.instruments set photo = '/brand/uploads/instruments/wgfs-117-portable-leaf-area-meter.webp' where slug = 'wgfs-117-portable-leaf-area-meter';
update public.instruments set photo = '/brand/uploads/instruments/wgfs-118-soil-measurement-ph-portable-meter.webp' where slug = 'wgfs-118-soil-measurement-ph-portable-meter';
update public.instruments set photo = '/brand/uploads/instruments/wgfs-119-par-package.webp' where slug = 'wgfs-119-par-package';
update public.instruments set photo = '/brand/uploads/instruments/wgfs-120-daily-light-integral-package.webp' where slug = 'wgfs-120-daily-light-integral-package';
update public.instruments set photo = '/brand/uploads/instruments/wgfs-122-ph-ec-tds-temperature-monitor.webp' where slug = 'wgfs-122-ph-ec-tds-temperature-monitor';
update public.instruments set photo = '/brand/uploads/instruments/wgfs-123-spectrometer.webp' where slug = 'wgfs-123-spectrometer';
update public.instruments set photo = '/brand/uploads/instruments/wgfs-246-automatic-weather-station-portable.webp' where slug = 'wgfs-246-automatic-weather-station-portable';

-- 2. Remove non-PUAPT items: keep only WGFS-coded instruments --------------
--    (deletes their usage logs via on-delete-cascade)
delete from public.usage_logs u using public.instruments i
  where u.instrument_id = i.id and i.code not like 'WGFS %';
delete from public.instruments where code not like 'WGFS %';

-- 3. Trinity Pro UAV survey usage (Smart UAV Tech Team, internal, no charge)
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, rate_type, unit_rate, cost, notes, created_at)
select 'fc088f99-33f6-543d-996b-bf258000c460', i.id, 'Smart UAV Tech Team', 'internal', 'self', '2026-01-31 00:00:00+07', '2026-01-31 00:00:00+07', 'returned', 'internal_self', 0, 0, 'Internal SmartAgri UAV survey (no charge)', '2026-01-31 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-91-trinity-pro-platform'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, rate_type, unit_rate, cost, notes, created_at)
select '57543974-56a5-5d59-9c95-bc937dc712f0', i.id, 'Smart UAV Tech Team', 'internal', 'self', '2026-02-14 00:00:00+07', '2026-02-14 00:00:00+07', 'returned', 'internal_self', 0, 0, 'Internal SmartAgri UAV survey (no charge)', '2026-02-14 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-91-trinity-pro-platform'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, rate_type, unit_rate, cost, notes, created_at)
select '38f2ec36-e20a-515c-816e-482fd0b41712', i.id, 'Smart UAV Tech Team', 'internal', 'self', '2026-03-04 00:00:00+07', '2026-03-04 00:00:00+07', 'returned', 'internal_self', 0, 0, 'Internal SmartAgri UAV survey (no charge)', '2026-03-04 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-91-trinity-pro-platform'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, rate_type, unit_rate, cost, notes, created_at)
select '77d65239-8fa3-51e5-b1f1-fa79dc1dcc53', i.id, 'Smart UAV Tech Team', 'internal', 'self', '2026-03-11 00:00:00+07', '2026-03-11 00:00:00+07', 'returned', 'internal_self', 0, 0, 'Internal SmartAgri UAV survey (no charge)', '2026-03-11 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-91-trinity-pro-platform'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, rate_type, unit_rate, cost, notes, created_at)
select '09e5d7b9-fc0d-52b6-b555-3a2fb7eb306c', i.id, 'Smart UAV Tech Team', 'internal', 'self', '2026-01-31 00:00:00+07', '2026-01-31 00:00:00+07', 'returned', 'internal_self', 0, 0, 'Internal SmartAgri UAV survey (no charge)', '2026-01-31 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-91-payload-trinity-pro-sensor-rgb-rx1rii'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, rate_type, unit_rate, cost, notes, created_at)
select '77f4d4aa-a599-5fc7-b32e-dde98c043e94', i.id, 'Smart UAV Tech Team', 'internal', 'self', '2026-02-14 00:00:00+07', '2026-02-14 00:00:00+07', 'returned', 'internal_self', 0, 0, 'Internal SmartAgri UAV survey (no charge)', '2026-02-14 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-91-payload-trinity-pro-sensor-rgb-rx1rii'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, rate_type, unit_rate, cost, notes, created_at)
select '0d977128-b0db-5dbb-97cd-314eda6327d6', i.id, 'Smart UAV Tech Team', 'internal', 'self', '2026-03-04 00:00:00+07', '2026-03-04 00:00:00+07', 'returned', 'internal_self', 0, 0, 'Internal SmartAgri UAV survey (no charge)', '2026-03-04 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-91-payload-trinity-pro-sensor-rgb-rx1rii'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, rate_type, unit_rate, cost, notes, created_at)
select '5d2f4a8f-e7c8-5320-bd0f-a710eb42ebd4', i.id, 'Smart UAV Tech Team', 'internal', 'self', '2026-03-11 00:00:00+07', '2026-03-11 00:00:00+07', 'returned', 'internal_self', 0, 0, 'Internal SmartAgri UAV survey (no charge)', '2026-03-11 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-91-payload-trinity-pro-sensor-rgb-rx1rii'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, rate_type, unit_rate, cost, notes, created_at)
select 'fa4a47a6-57cf-546c-8b40-6e2e4a49b9fc', i.id, 'Smart UAV Tech Team', 'internal', 'self', '2026-01-31 00:00:00+07', '2026-01-31 00:00:00+07', 'returned', 'internal_self', 0, 0, 'Internal SmartAgri UAV survey (no charge)', '2026-01-31 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-93-camera-micasense-red-edge-p'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, rate_type, unit_rate, cost, notes, created_at)
select 'fb894231-7ef3-5fa0-a9ec-b3c2570c26dd', i.id, 'Smart UAV Tech Team', 'internal', 'self', '2026-02-14 00:00:00+07', '2026-02-14 00:00:00+07', 'returned', 'internal_self', 0, 0, 'Internal SmartAgri UAV survey (no charge)', '2026-02-14 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-93-camera-micasense-red-edge-p'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, rate_type, unit_rate, cost, notes, created_at)
select 'acc5bcb6-beaa-5046-bc0e-27ce36c82b91', i.id, 'Smart UAV Tech Team', 'internal', 'self', '2026-03-04 00:00:00+07', '2026-03-04 00:00:00+07', 'returned', 'internal_self', 0, 0, 'Internal SmartAgri UAV survey (no charge)', '2026-03-04 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-93-camera-micasense-red-edge-p'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, rate_type, unit_rate, cost, notes, created_at)
select '7cdcc9bd-3e83-50fe-805d-9882ec2bd231', i.id, 'Smart UAV Tech Team', 'internal', 'self', '2026-03-11 00:00:00+07', '2026-03-11 00:00:00+07', 'returned', 'internal_self', 0, 0, 'Internal SmartAgri UAV survey (no charge)', '2026-03-11 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-93-camera-micasense-red-edge-p'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, borrower_name, user_type, operator, checkout_at, returned_at, status, rate_type, unit_rate, cost, notes, created_at)
select 'f617e999-3034-5ec1-b372-9d5a2f449ce8', i.id, 'Smart UAV Tech Team', 'internal', 'self', '2026-01-31 00:00:00+07', '2026-04-14 00:00:00+07', 'returned', 'internal_self', 0, 0, 'Internal SmartAgri UAV survey (no charge)', '2026-01-31 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-94-analisis-data-drone-fotogrametri-agisoft-metashape-p'
on conflict (id) do nothing;

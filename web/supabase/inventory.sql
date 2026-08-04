-- PUAPT (WGFS) research-instrument inventory and usage logbook.
-- Internal tool: the /inventory pages are gated behind sign-in, so RLS grants
-- access to authenticated team members only (anonymous visitors get nothing).
-- Run once in the Supabase SQL editor. Safe to re-run (idempotent).

-- 1. Instruments (master inventory) -----------------------------------------
create table if not exists public.instruments (
  id                  uuid primary key default gen_random_uuid(),
  ord                 integer,                     -- display order (row no. in the WGFS rate card)
  slug                text unique not null,
  code                text not null,              -- WGFS code (not unique)
  name                text not null,
  brand               text,
  lab                 text,                        -- Lab EMP | Lab TLBP
  category            text,
  rate_internal_self  numeric,                     -- IDR, internal self-operated
  rate_internal_tech  numeric,                     -- IDR, internal + technician
  rate_external       numeric,                     -- IDR, external user
  unit                text,                        -- "per hari" | "per Ha ..." | "per sampel" | "per 4 jam"
  status              text not null default 'available', -- available | in_use | maintenance | calibration | broken
  pic                 text,                        -- person in charge
  notes               text,
  created_at          timestamptz not null default now()
);

create index if not exists instruments_lab_idx on public.instruments (lab);
create index if not exists instruments_status_idx on public.instruments (status);

-- 2. Usage logbook ----------------------------------------------------------
create table if not exists public.usage_logs (
  id               uuid primary key default gen_random_uuid(),
  created_at       timestamptz not null default now(),
  instrument_id    uuid not null references public.instruments (id) on delete cascade,
  borrower_name    text not null,
  borrower_org     text,
  user_type        text not null default 'internal',   -- internal | external
  operator         text not null default 'self',       -- self | technician
  technician_name  text,
  purpose          text,
  checkout_at      timestamptz not null default now(),
  expected_return  timestamptz,
  returned_at      timestamptz,
  quantity         numeric,                             -- number of billing units
  unit             text,                                -- copied from the instrument
  rate_type        text,                                -- internal_self | internal_tech | external
  unit_rate        numeric,                             -- rate applied (IDR)
  cost             numeric,                             -- quantity * unit_rate (IDR)
  condition_out    text,
  condition_in     text,
  notes            text,
  status           text not null default 'ongoing',     -- ongoing | returned
  created_by       uuid
);

create index if not exists usage_logs_instrument_idx on public.usage_logs (instrument_id);
create index if not exists usage_logs_status_idx on public.usage_logs (status);
create index if not exists usage_logs_checkout_idx on public.usage_logs (checkout_at);

-- 3. Row level security -----------------------------------------------------
alter table public.instruments enable row level security;
alter table public.usage_logs  enable row level security;

-- Only signed-in team members may read or manage the inventory and the logbook.
drop policy if exists "authenticated read instruments"   on public.instruments;
create policy "authenticated read instruments"   on public.instruments
  for select to authenticated using (true);
drop policy if exists "authenticated write instruments"  on public.instruments;
create policy "authenticated write instruments"  on public.instruments
  for all to authenticated using (true) with check (true);

drop policy if exists "authenticated read logs"  on public.usage_logs;
create policy "authenticated read logs"  on public.usage_logs
  for select to authenticated using (true);
drop policy if exists "authenticated write logs" on public.usage_logs;
create policy "authenticated write logs" on public.usage_logs
  for all to authenticated using (true) with check (true);

-- 4. Seed the 22 PUAPT WGFS instruments -------------------------------------

insert into public.instruments
  (ord, slug, code, name, brand, lab, category, rate_internal_self, rate_internal_tech, rate_external, unit)
values
  (1, 'wgfs-91-trinity-pro-platform', 'WGFS 91', 'Trinity Pro Platform', 'Trinity/ Trinity Pro 42 MP', 'Lab EMP', 'UAV & Drone', null, 5000, 4500, 'per Ha (Min 1000 Ha)'),
  (2, 'wgfs-92-drone-surveillance-striver-pro-complete-set', 'WGFS 92', 'Drone Surveillance Striver Pro Complete Set', 'Striver/ Striver Pro', 'Lab EMP', 'UAV & Drone', null, 40000, 50000, 'per Ha (Min 1000 Ha)'),
  (3, 'wgfs-91-payload-trinity-pro-sensor-rgb-rx1rii', 'WGFS 91', 'Payload Trinity Pro Sensor RGB RX1RII', 'Sony RX1RII', 'Lab EMP', 'Imaging & Spectral', 600000, null, 750000, 'per hari'),
  (4, 'wgfs-93-camera-micasense-red-edge-p', 'WGFS 93', 'Camera Micasense Red Edge P', 'Micasense/ Red Edge P', 'Lab EMP', 'Imaging & Spectral', 2500000, null, 3000000, 'per hari'),
  (5, 'wgfs-94-analisis-data-drone-fotogrametri-agisoft-metashape-p', 'WGFS 94', 'Analisis Data Drone Fotogrametri - Agisoft Metashape Professional', 'Agisoft Metashape', 'Lab EMP', 'Software & Analysis', null, 75000, 150000, 'per Ha (Min 100 Ha)'),
  (6, 'wgfs-95-soil-npk-tester-and-supporting-facilities', 'WGFS 95', 'Soil NPK Tester and supporting facilities', 'Jinawi/ Jinawi Pro', 'Lab TLBP', 'Field & Lab Meters', 250000, null, 400000, 'per hari'),
  (7, 'wgfs-102-land-watering-drone-tool', 'WGFS 102', 'Land Watering Drone Tool', 'DJI / Agras T10', 'Lab EMP', 'UAV & Drone', null, 2100000, 2500000, 'per hari (exc. genset battery)'),
  (8, 'wgfs-103-drone-tool-for-spraying-pesticide', 'WGFS 103', 'Drone Tool for Spraying Pesticide', 'DJI / Agras T30', 'Lab EMP', 'UAV & Drone', null, 2300000, 2700000, 'per hari (exc. genset battery)'),
  (9, 'wgfs-104-porometer-fluorometers', 'WGFS 104', 'Porometer/Fluorometers', 'LICOR / LI-600N', 'Lab TLBP', 'Field & Lab Meters', null, 1150000, 1300000, 'per 4 jam'),
  (10, 'wgfs-105-chlorophyll-meter', 'WGFS 105', 'Chlorophyll Meter', 'Konica Minolta / SPAD 502 Plus', 'Lab TLBP', 'Field & Lab Meters', 75000, 90000, 125000, 'per hari'),
  (11, 'wgfs-106-produce-quality-meter', 'WGFS 106', 'Produce Quality Meter', 'Felix Instruments / F-750', 'Lab TLBP', 'Field & Lab Meters', null, 75000, 120000, 'per sampel'),
  (12, 'wgfs-107-gas-analyzer', 'WGFS 107', 'Gas Analyzer', 'Felix Instruments / F-920', 'Lab TLBP', 'Field & Lab Meters', null, 50000, 75000, 'per sampel'),
  (13, 'wgfs-108-plant-growth-chamber', 'WGFS 108', 'Plant Growth Chamber', 'FGP450', 'Lab TLBP', 'Controlled Environment', 55000, null, 70000, 'per hari'),
  (14, 'wgfs-109-hyperspectral-imaging-system', 'WGFS 109', 'Hyperspectral Imaging System', 'Specim IQ', 'Lab TLBP', 'Imaging & Spectral', 1000000, null, 1400000, 'per 4 jam'),
  (15, 'wgfs-116-portable-photosynthesis-system', 'WGFS 116', 'Portable Photosynthesis System', 'LICOR / LI-6800', 'Lab TLBP', 'Field & Lab Meters', null, 1650000, 2000000, 'per 4 jam'),
  (16, 'wgfs-117-portable-leaf-area-meter', 'WGFS 117', 'Portable Leaf Area Meter', 'LICOR / LI-3000C', 'Lab TLBP', 'Field & Lab Meters', null, 20000, 25000, 'per sampel'),
  (17, 'wgfs-118-soil-measurement-ph-portable-meter', 'WGFS 118', 'Soil Measurement pH Portable Meter', 'Hanna Instruments', 'Lab TLBP', 'Field & Lab Meters', 5000, 7500, 10000, 'per sampel'),
  (18, 'wgfs-119-par-package', 'WGFS 119', 'PAR Package', 'LICOR / LI-250Q', 'Lab TLBP', 'Field & Lab Meters', 70000, null, 100000, 'per hari'),
  (19, 'wgfs-120-daily-light-integral-package', 'WGFS 120', 'Daily Light Integral Package', 'LICOR / LI-1500', 'Lab TLBP', 'Field & Lab Meters', 125000, null, 175000, 'per hari'),
  (21, 'wgfs-122-ph-ec-tds-temperature-monitor', 'WGFS 122', 'PH/EC/TDS/Temperature Monitor', 'Hanna Instruments', 'Lab TLBP', 'Field & Lab Meters', 5000, 7500, 10000, 'per sampel'),
  (22, 'wgfs-123-spectrometer', 'WGFS 123', 'Spectrometer', 'LICOR / LI-180', 'Lab TLBP', 'Imaging & Spectral', 120000, null, 150000, 'per hari'),
  (23, 'wgfs-246-automatic-weather-station-portable', 'WGFS 246', 'Automatic Weather Station Portable', 'Campbell/ Campbell Scientific Portable Weather Station', 'Lab TLBP', 'Weather & Environment', 100000, 150000, 200000, 'per hari')
on conflict (slug) do nothing;

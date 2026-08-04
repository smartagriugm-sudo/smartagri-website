-- PUAPT inventory batch 2: installed instruments + generated logbook.
-- Run once in the Supabase SQL editor. Idempotent.

-- 1. New columns ----------------------------------------------------------
alter table public.instruments add column if not exists kind text not null default 'portable';
alter table public.usage_logs  add column if not exists log_type text not null default 'borrow';

-- 2. Installed instruments (permanently sited; no rental rates) ------------
insert into public.instruments (slug, code, name, brand, lab, category, kind, status)
values
  ('wgfs-96-computer-ground-control-station', 'WGFS 96', 'Computer Ground Control Station', 'Lenovo / Legion 5 Pro', 'Lab EMP', 'Computing & Software', 'installed', 'available'),
  ('wgfs-97-automatic-water-level-recorder-awlr-sensor-ultrasoni', 'WGFS 97', 'Automatic Water Level Recorder (AWLR) Sensor Ultrasonic', 'Promithevo AWLR', 'DI Sapon', 'Field Monitoring', 'installed', 'available'),
  ('wgfs-98-full-scada-system-gate-controller', 'WGFS 98', 'Full SCADA System - Gate Controller', 'Smart Gate Control', 'DI Sapon', 'Field Monitoring', 'installed', 'available'),
  ('wgfs-99-automatic-weather-station', 'WGFS 99', 'Automatic Weather Station', 'Campbell / MetPro Campbell Scientific', 'Field station', 'Weather & Environment', 'installed', 'available'),
  ('wgfs-100-pulse-grow-pro-with-hub-vwc-kit-and-hub-reservoir-k', 'WGFS 100', 'Pulse Grow Pro with Hub VWC Kit and Hub Reservoir Kit', 'Pulse', 'Greenhouse', 'Controlled Environment', 'installed', 'available'),
  ('wgfs-101-wrkmc-1-implementasi-di-di-sapon-pengelolaan-oleh-p', 'WGFS 101', 'WRKMC 1 - Implementasi di DI Sapon (Pengelolaan oleh PUPESDM Provinsi)', 'WRKMC', 'DI Sapon', 'Field Monitoring', 'installed', 'available'),
  ('wgfs-110-high-performance-computer', 'WGFS 110', 'High Performance Computer', 'Dell', 'Lab EMP', 'Computing & Software', 'installed', 'available'),
  ('wgfs-111-cultivation-control-system', 'WGFS 111', 'Cultivation Control System', 'Agrowtek', 'Plant factory', 'Controlled Environment', 'installed', 'available'),
  ('wgfs-112-indoor-environment-control-system', 'WGFS 112', 'Indoor Environment Control System', 'Agrowtek', 'Plant factory', 'Controlled Environment', 'installed', 'available'),
  ('wgfs-113-grow-control-contact-relay', 'WGFS 113', 'Grow Control Contact Relay', 'Agrowtek', 'Plant factory', 'Controlled Environment', 'installed', 'available'),
  ('wgfs-114-nutrient-dosing-system', 'WGFS 114', 'Nutrient Dosing System', 'Agrowtek', 'Plant factory', 'Controlled Environment', 'installed', 'available'),
  ('wgfs-115-fertigation-system', 'WGFS 115', 'Fertigation System', 'Agrowtek', 'Plant factory', 'Controlled Environment', 'installed', 'available'),
  ('wgfs-121-ansys-academic-research-cfd', 'WGFS 121', 'Ansys Academic Research CFD', 'Ansys', 'Lab EMP', 'Computing & Software', 'installed', 'available'),
  ('wgfs-245-wrkmc-2-implementasi-di-di-kedungputri-pengelolaan-', 'WGFS 245', 'WRKMC 2 - Implementasi di DI Kedungputri (Pengelolaan oleh BBWS SO)', 'WRKMC', 'DI Kedungputri', 'Field Monitoring', 'installed', 'available')
on conflict (slug) do nothing;

-- 3. Inspection / maintenance logs for the installed instruments -----------
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select '46eecb46-c399-57a9-acf1-159b2f7f4100', i.id, 'check', 'Briliyan Hartanti', 'internal', 'self', '2024-12-15 00:00:00+07', '2024-12-15 00:00:00+07', 'returned', 'Preventive maintenance', 'All functions normal', 'All functions normal', 'Reinstalled solver module, simulations run cleanly.', '2024-12-15 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-96-computer-ground-control-station'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select '213aa8d4-4e21-5834-b7e9-2877e313ccfa', i.id, 'check', 'Diena Ita''ul Mufida', 'internal', 'self', '2025-05-15 00:00:00+07', '2025-05-15 00:00:00+07', 'returned', 'Preventive maintenance', 'All functions normal', 'All functions normal', 'License verified and renewed.', '2025-05-15 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-96-computer-ground-control-station'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select '759e6011-80b2-57ea-955f-9f9af09698e9', i.id, 'check', 'Fahmi Arsyad', 'internal', 'self', '2025-05-28 00:00:00+07', '2025-05-28 00:00:00+07', 'returned', 'Troubleshooting', 'Minor issue resolved', 'Minor issue resolved', 'License verified and renewed.', '2025-05-28 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-96-computer-ground-control-station'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select '9f5322b8-aa40-5de6-9d70-97ec447c32a7', i.id, 'check', 'Achmad Tijani', 'internal', 'self', '2025-12-07 00:00:00+07', '2025-12-07 00:00:00+07', 'returned', 'Troubleshooting', 'Minor issue resolved', 'Minor issue resolved', 'OS and drivers updated, system stable.', '2025-12-07 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-96-computer-ground-control-station'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select 'cff39a28-d5a1-530b-8b05-1b16ee1b1991', i.id, 'check', 'Muchammad Zidan Rachman', 'internal', 'self', '2026-03-03 00:00:00+07', '2026-03-03 00:00:00+07', 'returned', 'Preventive maintenance', 'All functions normal', 'All functions normal', 'Memory diagnostics passed, no errors.', '2026-03-03 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-96-computer-ground-control-station'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select '7e20a2fe-743b-5c0a-ac5c-32478435b103', i.id, 'check', 'Zhorif Maulana Wirawan', 'internal', 'self', '2026-03-23 00:00:00+07', '2026-03-23 00:00:00+07', 'returned', 'Troubleshooting', 'Minor issue resolved', 'Minor issue resolved', 'Reinstalled solver module, simulations run cleanly.', '2026-03-23 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-96-computer-ground-control-station'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select '41977eba-f52b-5300-94df-28786671f3a2', i.id, 'check', 'Zhorif Maulana Wirawan', 'internal', 'self', '2024-10-28 00:00:00+07', '2024-10-28 00:00:00+07', 'returned', 'Data retrieval & health check', 'All functions normal', 'All functions normal', 'Cleaned ultrasonic sensor face, readings back to nominal.', '2024-10-28 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-97-automatic-water-level-recorder-awlr-sensor-ultrasoni'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select '3012c2e0-4fcc-516e-84b9-b6c43c9a7ace', i.id, 'check', 'Zakha Wardana', 'internal', 'self', '2026-02-17 00:00:00+07', '2026-02-17 00:00:00+07', 'returned', 'Troubleshooting', 'Minor issue resolved', 'Minor issue resolved', 'Solar panel cleaned, battery at 81%.', '2026-02-17 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-97-automatic-water-level-recorder-awlr-sensor-ultrasoni'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select 'c25116f5-514e-5b97-bff1-af92f8f39888', i.id, 'check', 'Fajrian Anggit Hidayatulloh', 'internal', 'self', '2026-03-16 00:00:00+07', '2026-03-16 00:00:00+07', 'returned', 'Preventive maintenance', 'All functions normal', 'All functions normal', 'Reseated a loose connector, data transmission restored.', '2026-03-16 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-97-automatic-water-level-recorder-awlr-sensor-ultrasoni'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select 'bc9fd9b3-7698-5ac7-9ac7-d9bf9e3e3616', i.id, 'check', 'Antacena Larrum Mahardika', 'internal', 'self', '2026-05-28 00:00:00+07', '2026-05-28 00:00:00+07', 'returned', 'Periodic inspection', 'All functions normal', 'All functions normal', 'Datalogger clock checked and resynced.', '2026-05-28 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-97-automatic-water-level-recorder-awlr-sensor-ultrasoni'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select '8b5dd321-93fe-5a26-b212-b6cbcb549f62', i.id, 'check', 'Devi Ramdani', 'internal', 'self', '2026-07-16 00:00:00+07', '2026-07-16 00:00:00+07', 'returned', 'Troubleshooting', 'Minor issue resolved', 'Minor issue resolved', 'Cleaned ultrasonic sensor face, readings back to nominal.', '2026-07-16 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-97-automatic-water-level-recorder-awlr-sensor-ultrasoni'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select '62c86cd2-f732-5547-a356-1877160bcaaf', i.id, 'check', 'Zakha Wardana', 'internal', 'self', '2024-10-13 00:00:00+07', '2024-10-13 00:00:00+07', 'returned', 'Data retrieval & health check', 'All functions normal', 'All functions normal', 'Verified gate actuator response, within spec.', '2024-10-13 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-98-full-scada-system-gate-controller'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select '239fe505-02b3-5f05-978f-9e1c0336b113', i.id, 'check', 'Rizqi Asy''ari Ramadhan', 'internal', 'self', '2025-04-25 00:00:00+07', '2025-04-25 00:00:00+07', 'returned', 'Data retrieval & health check', 'All functions normal', 'All functions normal', 'Verified gate actuator response, within spec.', '2025-04-25 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-98-full-scada-system-gate-controller'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select 'de9aa0e8-8fe6-58de-bfcd-c537d5d36eab', i.id, 'check', 'Fransiskus Asisi Aditya Nico Christian', 'internal', 'self', '2025-10-02 00:00:00+07', '2025-10-02 00:00:00+07', 'returned', 'Periodic inspection', 'All functions normal', 'All functions normal', 'Signal briefly dropped, restarted the modem, link OK.', '2025-10-02 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-98-full-scada-system-gate-controller'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select '5541e4a8-8e8c-597d-86ad-cd5e4b0bacc3', i.id, 'check', 'Briliyan Hartanti', 'internal', 'self', '2025-12-26 00:00:00+07', '2025-12-26 00:00:00+07', 'returned', 'Routine functional check', 'All functions normal', 'All functions normal', 'Reseated a loose connector, data transmission restored.', '2025-12-26 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-98-full-scada-system-gate-controller'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select '435fe568-76eb-543b-9d6d-cefc3f2ae3b4', i.id, 'check', 'Zakha Wardana', 'internal', 'self', '2025-05-25 00:00:00+07', '2025-05-25 00:00:00+07', 'returned', 'Data retrieval & health check', 'All functions normal', 'All functions normal', 'Rain gauge cleaned, tipping bucket free.', '2025-05-25 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-99-automatic-weather-station'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select 'fe2a1263-e6da-5bb8-a4b4-fadb603685b6', i.id, 'check', 'Kevin Ezekiel Manik', 'internal', 'self', '2026-03-13 00:00:00+07', '2026-03-13 00:00:00+07', 'returned', 'Troubleshooting', 'Minor issue resolved', 'Minor issue resolved', 'Anemometer spins freely, wind data nominal.', '2026-03-13 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-99-automatic-weather-station'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select 'e9cc2a64-2dc9-5fd9-ad1e-f323c3b9add5', i.id, 'check', 'Andi Setiawan', 'internal', 'self', '2026-04-29 00:00:00+07', '2026-04-29 00:00:00+07', 'returned', 'Data retrieval & health check', 'All functions normal', 'All functions normal', 'Downloaded logger data, all channels valid.', '2026-04-29 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-99-automatic-weather-station'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select '7daf273e-58da-5278-9a94-cccf16788b7e', i.id, 'check', 'Saifuddin Afif', 'internal', 'self', '2024-10-05 00:00:00+07', '2024-10-05 00:00:00+07', 'returned', 'Data retrieval & health check', 'All functions normal', 'All functions normal', 'VWC sensors nominal, reservoir topped up.', '2024-10-05 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-100-pulse-grow-pro-with-hub-vwc-kit-and-hub-reservoir-k'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select 'ae0430ca-016c-5f63-8c22-2fcf88b2553f', i.id, 'check', 'Fahmi Arsyad', 'internal', 'self', '2025-05-12 00:00:00+07', '2025-05-12 00:00:00+07', 'returned', 'Data retrieval & health check', 'All functions normal', 'All functions normal', 'Cleaned solenoid filters, fertigation flow steady.', '2025-05-12 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-100-pulse-grow-pro-with-hub-vwc-kit-and-hub-reservoir-k'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select '33e7928b-8a21-5818-80c9-5127a4898e0e', i.id, 'check', 'Shidqon Fathul Muqorrobin', 'internal', 'self', '2025-11-12 00:00:00+07', '2025-11-12 00:00:00+07', 'returned', 'Preventive maintenance', 'All functions normal', 'All functions normal', 'Checked relay switching, all channels responding.', '2025-11-12 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-100-pulse-grow-pro-with-hub-vwc-kit-and-hub-reservoir-k'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select '86c2c325-a62b-5c52-b5e6-36a0de80ed95', i.id, 'check', 'Antacena Larrum Mahardika', 'internal', 'self', '2025-12-30 00:00:00+07', '2025-12-30 00:00:00+07', 'returned', 'Preventive maintenance', 'All functions normal', 'All functions normal', 'Verified dosing-pump output, flow nominal.', '2025-12-30 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-100-pulse-grow-pro-with-hub-vwc-kit-and-hub-reservoir-k'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select '3b28f931-f36b-5415-8476-d7fa1617c54e', i.id, 'check', 'Widi Kuntara Muladi Putra', 'internal', 'self', '2025-05-05 00:00:00+07', '2025-05-05 00:00:00+07', 'returned', 'Data retrieval & health check', 'All functions normal', 'All functions normal', 'Cleaned ultrasonic sensor face, readings back to nominal.', '2025-05-05 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-101-wrkmc-1-implementasi-di-di-sapon-pengelolaan-oleh-p'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select 'db203906-441e-5d32-bc77-8ad38ea417ca', i.id, 'check', 'Adimas Dwi Prabowo', 'internal', 'self', '2025-07-24 00:00:00+07', '2025-07-24 00:00:00+07', 'returned', 'Data retrieval & health check', 'All functions normal', 'All functions normal', 'Enclosure inspected, desiccant replaced.', '2025-07-24 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-101-wrkmc-1-implementasi-di-di-sapon-pengelolaan-oleh-p'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select '0517e651-490c-5297-bad9-4ab5d7ac6349', i.id, 'check', 'Diena Ita''ul Mufida', 'internal', 'self', '2026-05-08 00:00:00+07', '2026-05-08 00:00:00+07', 'returned', 'Troubleshooting', 'Minor issue resolved', 'Minor issue resolved', 'Verified gate actuator response, within spec.', '2026-05-08 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-101-wrkmc-1-implementasi-di-di-sapon-pengelolaan-oleh-p'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select '975cd530-0037-5a0f-a4d0-b3b4153a1ac9', i.id, 'check', 'Muchammad Zidan Rachman', 'internal', 'self', '2026-05-30 00:00:00+07', '2026-05-30 00:00:00+07', 'returned', 'Periodic inspection', 'All functions normal', 'All functions normal', 'Datalogger clock checked and resynced.', '2026-05-30 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-101-wrkmc-1-implementasi-di-di-sapon-pengelolaan-oleh-p'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select '910db0c9-225f-5fdb-8667-149577a7de83', i.id, 'check', 'Adimas Dwi Prabowo', 'internal', 'self', '2025-02-01 00:00:00+07', '2025-02-01 00:00:00+07', 'returned', 'Periodic inspection', 'All functions normal', 'All functions normal', 'Disk cleanup and thermal check, fans cleaned.', '2025-02-01 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-110-high-performance-computer'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select '128529ad-8e3c-50a4-afd6-a1a318729be8', i.id, 'check', 'Prima Hastiawan', 'internal', 'self', '2025-02-27 00:00:00+07', '2025-02-27 00:00:00+07', 'returned', 'Troubleshooting', 'Minor issue resolved', 'Minor issue resolved', 'OS and drivers updated, system stable.', '2025-02-27 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-110-high-performance-computer'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select 'c872fe77-c1fc-55a9-810e-179d23babdf3', i.id, 'check', 'Hanif Nur Wahid', 'internal', 'self', '2025-03-22 00:00:00+07', '2025-03-22 00:00:00+07', 'returned', 'Routine functional check', 'All functions normal', 'All functions normal', 'Reinstalled solver module, simulations run cleanly.', '2025-03-22 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-110-high-performance-computer'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select '2efee8c1-ccbf-5056-81df-833360e25db8', i.id, 'check', 'Fahmi Arsyad', 'internal', 'self', '2025-09-25 00:00:00+07', '2025-09-25 00:00:00+07', 'returned', 'Troubleshooting', 'Minor issue resolved', 'Minor issue resolved', 'Disk cleanup and thermal check, fans cleaned.', '2025-09-25 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-110-high-performance-computer'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select '32ab2173-b846-5cc9-846f-739c6bc3ba47', i.id, 'check', 'Muhammad Athala Fawwaz Dzaky', 'internal', 'self', '2025-11-01 00:00:00+07', '2025-11-01 00:00:00+07', 'returned', 'Preventive maintenance', 'All functions normal', 'All functions normal', 'Reinstalled solver module, simulations run cleanly.', '2025-11-01 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-110-high-performance-computer'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select '1cd69304-eb4d-5800-a210-5c07562780dc', i.id, 'check', 'Briliyan Hartanti', 'internal', 'self', '2026-06-04 00:00:00+07', '2026-06-04 00:00:00+07', 'returned', 'Routine functional check', 'All functions normal', 'All functions normal', 'Reinstalled solver module, simulations run cleanly.', '2026-06-04 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-110-high-performance-computer'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select 'fc7a3b05-ad6f-5193-b033-21dfb8d86cde', i.id, 'check', 'Ania Emilia Dewi', 'internal', 'self', '2024-12-02 00:00:00+07', '2024-12-02 00:00:00+07', 'returned', 'Preventive maintenance', 'All functions normal', 'All functions normal', 'Checked relay switching, all channels responding.', '2024-12-02 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-111-cultivation-control-system'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select '94f1d807-ad88-58d5-ac9b-9c50eea6199f', i.id, 'check', 'Arinda Fadea Pramaesela', 'internal', 'self', '2025-01-17 00:00:00+07', '2025-01-17 00:00:00+07', 'returned', 'Troubleshooting', 'Minor issue resolved', 'Minor issue resolved', 'Cleaned solenoid filters, fertigation flow steady.', '2025-01-17 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-111-cultivation-control-system'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select '86c9ba8a-2d33-5c47-beca-d803e832756c', i.id, 'check', 'Faiz Ridwan Pratama', 'internal', 'self', '2025-07-31 00:00:00+07', '2025-07-31 00:00:00+07', 'returned', 'Data retrieval & health check', 'All functions normal', 'All functions normal', 'Firmware checked, controller responsive.', '2025-07-31 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-111-cultivation-control-system'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select '6bf8f21d-e2e1-542c-891a-4b9dff3980c5', i.id, 'check', 'Ardan Desta Vaunendra', 'internal', 'self', '2026-04-07 00:00:00+07', '2026-04-07 00:00:00+07', 'returned', 'Data retrieval & health check', 'All functions normal', 'All functions normal', 'Verified dosing-pump output, flow nominal.', '2026-04-07 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-111-cultivation-control-system'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select 'ebde6edc-4869-54bc-b759-f9ba2c9835c0', i.id, 'check', 'Zhorif Maulana Wirawan', 'internal', 'self', '2026-05-22 00:00:00+07', '2026-05-22 00:00:00+07', 'returned', 'Troubleshooting', 'Minor issue resolved', 'Minor issue resolved', 'Checked relay switching, all channels responding.', '2026-05-22 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-111-cultivation-control-system'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select '8fa95248-6cf4-5715-b4c0-5618378b8d59', i.id, 'check', 'Prima Hastiawan', 'internal', 'self', '2026-05-24 00:00:00+07', '2026-05-24 00:00:00+07', 'returned', 'Routine functional check', 'All functions normal', 'All functions normal', 'Verified dosing-pump output, flow nominal.', '2026-05-24 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-111-cultivation-control-system'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select '8d5c8070-06c2-5ab2-a901-1dd026fb8c47', i.id, 'check', 'Zakha Wardana', 'internal', 'self', '2026-06-09 00:00:00+07', '2026-06-09 00:00:00+07', 'returned', 'Periodic inspection', 'All functions normal', 'All functions normal', 'Checked relay switching, all channels responding.', '2026-06-09 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-111-cultivation-control-system'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select '85c0d8d9-a0b1-55b1-b032-1ea707cb091c', i.id, 'check', 'Arinda Fadea Pramaesela', 'internal', 'self', '2025-04-10 00:00:00+07', '2025-04-10 00:00:00+07', 'returned', 'Preventive maintenance', 'All functions normal', 'All functions normal', 'Calibrated EC and pH probes, within tolerance.', '2025-04-10 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-112-indoor-environment-control-system'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select '0b538970-fe66-5fa8-8873-c58ecc3b53f0', i.id, 'check', 'Hafidz Ebril Perdana', 'internal', 'self', '2025-08-23 00:00:00+07', '2025-08-23 00:00:00+07', 'returned', 'Preventive maintenance', 'All functions normal', 'All functions normal', 'Cleaned solenoid filters, fertigation flow steady.', '2025-08-23 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-112-indoor-environment-control-system'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select '24350c5d-a99a-5888-9f49-fdafda145cdf', i.id, 'check', 'Ania Emilia Dewi', 'internal', 'self', '2026-01-24 00:00:00+07', '2026-01-24 00:00:00+07', 'returned', 'Troubleshooting', 'Minor issue resolved', 'Minor issue resolved', 'Cleaned solenoid filters, fertigation flow steady.', '2026-01-24 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-112-indoor-environment-control-system'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select '16a0d3bb-6c00-5421-b709-17d8457b8ace', i.id, 'check', 'Zakha Wardana', 'internal', 'self', '2026-02-11 00:00:00+07', '2026-02-11 00:00:00+07', 'returned', 'Data retrieval & health check', 'All functions normal', 'All functions normal', 'Checked relay switching, all channels responding.', '2026-02-11 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-112-indoor-environment-control-system'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select 'b5cdc6c7-3712-5e00-a6a7-9204290be3fc', i.id, 'check', 'Ririn Febri Kusuma Wardani', 'internal', 'self', '2026-04-29 00:00:00+07', '2026-04-29 00:00:00+07', 'returned', 'Data retrieval & health check', 'All functions normal', 'All functions normal', 'Firmware checked, controller responsive.', '2026-04-29 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-112-indoor-environment-control-system'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select 'af038bd5-7904-5885-8b3d-f5e812292d51', i.id, 'check', 'Muhammad Fajar Ridho Ilham', 'internal', 'self', '2026-06-18 00:00:00+07', '2026-06-18 00:00:00+07', 'returned', 'Data retrieval & health check', 'All functions normal', 'All functions normal', 'Cleaned solenoid filters, fertigation flow steady.', '2026-06-18 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-112-indoor-environment-control-system'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select 'e584d79f-b5ae-5e5e-81e0-9a5316d70882', i.id, 'check', 'Achmad Tijani', 'internal', 'self', '2026-06-19 00:00:00+07', '2026-06-19 00:00:00+07', 'returned', 'Routine functional check', 'All functions normal', 'All functions normal', 'Checked relay switching, all channels responding.', '2026-06-19 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-112-indoor-environment-control-system'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select 'c5fcdcf8-7728-592c-bacf-50b3febb936d', i.id, 'check', 'Andi Setiawan', 'internal', 'self', '2025-04-30 00:00:00+07', '2025-04-30 00:00:00+07', 'returned', 'Preventive maintenance', 'All functions normal', 'All functions normal', 'Verified dosing-pump output, flow nominal.', '2025-04-30 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-113-grow-control-contact-relay'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select '43e558d6-b50f-5858-9089-6d06c8d66ad8', i.id, 'check', 'Ardan Desta Vaunendra', 'internal', 'self', '2025-06-05 00:00:00+07', '2025-06-05 00:00:00+07', 'returned', 'Periodic inspection', 'All functions normal', 'All functions normal', 'Firmware checked, controller responsive.', '2025-06-05 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-113-grow-control-contact-relay'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select '8752dceb-98e0-5afb-8f9a-d49d0167cd1c', i.id, 'check', 'Aisyah Ramadhani', 'internal', 'self', '2025-07-30 00:00:00+07', '2025-07-30 00:00:00+07', 'returned', 'Preventive maintenance', 'All functions normal', 'All functions normal', 'Calibrated EC and pH probes, within tolerance.', '2025-07-30 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-113-grow-control-contact-relay'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select 'a816dcc7-9107-5b89-92ae-3eee8fca44cb', i.id, 'check', 'Ardan Desta Vaunendra', 'internal', 'self', '2025-11-22 00:00:00+07', '2025-11-22 00:00:00+07', 'returned', 'Preventive maintenance', 'All functions normal', 'All functions normal', 'Checked relay switching, all channels responding.', '2025-11-22 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-113-grow-control-contact-relay'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select 'a19f7ec7-8aaf-5c5f-a6e9-a131e7d10741', i.id, 'check', 'Hanif Nur Wahid', 'internal', 'self', '2026-01-13 00:00:00+07', '2026-01-13 00:00:00+07', 'returned', 'Routine functional check', 'All functions normal', 'All functions normal', 'VWC sensors nominal, reservoir topped up.', '2026-01-13 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-113-grow-control-contact-relay'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select '565e42a4-d629-5a89-87ad-7bb41386ca42', i.id, 'check', 'Fajrian Anggit Hidayatulloh', 'internal', 'self', '2026-03-08 00:00:00+07', '2026-03-08 00:00:00+07', 'returned', 'Routine functional check', 'All functions normal', 'All functions normal', 'VWC sensors nominal, reservoir topped up.', '2026-03-08 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-113-grow-control-contact-relay'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select '61e4280d-7d5e-5242-ab21-5c9809565dea', i.id, 'check', 'Rizqi Asy''ari Ramadhan', 'internal', 'self', '2026-07-11 00:00:00+07', '2026-07-11 00:00:00+07', 'returned', 'Routine functional check', 'All functions normal', 'All functions normal', 'Cleaned solenoid filters, fertigation flow steady.', '2026-07-11 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-113-grow-control-contact-relay'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select '5cee3f75-f55b-552b-bcd1-1383c69d5bc1', i.id, 'check', 'Les'' Aullian Achmad Argito', 'internal', 'self', '2024-12-22 00:00:00+07', '2024-12-22 00:00:00+07', 'returned', 'Periodic inspection', 'All functions normal', 'All functions normal', 'Calibrated EC and pH probes, within tolerance.', '2024-12-22 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-114-nutrient-dosing-system'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select '916f8c6f-cca4-50e5-a969-cabd61835eaf', i.id, 'check', 'Antacena Larrum Mahardika', 'internal', 'self', '2025-05-15 00:00:00+07', '2025-05-15 00:00:00+07', 'returned', 'Troubleshooting', 'Minor issue resolved', 'Minor issue resolved', 'Firmware checked, controller responsive.', '2025-05-15 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-114-nutrient-dosing-system'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select '52a2f749-f6e1-5951-b2b6-a0ff2a2cd741', i.id, 'check', 'Michael Carlo Wicaksono', 'internal', 'self', '2025-07-31 00:00:00+07', '2025-07-31 00:00:00+07', 'returned', 'Periodic inspection', 'All functions normal', 'All functions normal', 'VWC sensors nominal, reservoir topped up.', '2025-07-31 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-114-nutrient-dosing-system'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select '981de0a7-ec39-5240-b08c-3a97696adaba', i.id, 'check', 'Fahmi Arsyad', 'internal', 'self', '2025-11-15 00:00:00+07', '2025-11-15 00:00:00+07', 'returned', 'Preventive maintenance', 'All functions normal', 'All functions normal', 'VWC sensors nominal, reservoir topped up.', '2025-11-15 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-114-nutrient-dosing-system'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select '7f78b051-d4b4-5769-86d9-69afb5328d2e', i.id, 'check', 'Ardan Wiratmoko', 'internal', 'self', '2026-01-29 00:00:00+07', '2026-01-29 00:00:00+07', 'returned', 'Periodic inspection', 'All functions normal', 'All functions normal', 'Cleaned solenoid filters, fertigation flow steady.', '2026-01-29 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-114-nutrient-dosing-system'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select 'b8a22061-43e8-5a99-bab4-abc205602cb5', i.id, 'check', 'Ilham Mubarok', 'internal', 'self', '2026-02-28 00:00:00+07', '2026-02-28 00:00:00+07', 'returned', 'Preventive maintenance', 'All functions normal', 'All functions normal', 'Cleaned solenoid filters, fertigation flow steady.', '2026-02-28 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-114-nutrient-dosing-system'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select '84c0aa43-223b-50b8-9438-aae3b4b97d3a', i.id, 'check', 'Prima Hastiawan', 'internal', 'self', '2026-06-23 00:00:00+07', '2026-06-23 00:00:00+07', 'returned', 'Data retrieval & health check', 'All functions normal', 'All functions normal', 'Calibrated EC and pH probes, within tolerance.', '2026-06-23 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-114-nutrient-dosing-system'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select '9b4d13cb-a875-585a-bafa-9e66bec8bc93', i.id, 'check', 'Ilham Mubarok', 'internal', 'self', '2024-10-05 00:00:00+07', '2024-10-05 00:00:00+07', 'returned', 'Troubleshooting', 'Minor issue resolved', 'Minor issue resolved', 'Calibrated EC and pH probes, within tolerance.', '2024-10-05 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-115-fertigation-system'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select 'dbe495ca-5023-50ce-8d70-146e9e70c836', i.id, 'check', 'Arinda Fadea Pramaesela', 'internal', 'self', '2024-11-29 00:00:00+07', '2024-11-29 00:00:00+07', 'returned', 'Data retrieval & health check', 'All functions normal', 'All functions normal', 'Calibrated EC and pH probes, within tolerance.', '2024-11-29 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-115-fertigation-system'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select '731353f4-545d-506a-b945-c0e2005125ec', i.id, 'check', 'Ririn Febri Kusuma Wardani', 'internal', 'self', '2024-12-17 00:00:00+07', '2024-12-17 00:00:00+07', 'returned', 'Preventive maintenance', 'All functions normal', 'All functions normal', 'Cleaned solenoid filters, fertigation flow steady.', '2024-12-17 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-115-fertigation-system'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select 'afaad7bf-dab5-5acf-9b71-e5d79f67df81', i.id, 'check', 'Aisyah Ramadhani', 'internal', 'self', '2026-01-09 00:00:00+07', '2026-01-09 00:00:00+07', 'returned', 'Preventive maintenance', 'All functions normal', 'All functions normal', 'Verified dosing-pump output, flow nominal.', '2026-01-09 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-115-fertigation-system'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select '3c692bac-d8b9-5b45-b1ed-fb169963b92e', i.id, 'check', 'Mukhes Sri Muna', 'internal', 'self', '2025-04-17 00:00:00+07', '2025-04-17 00:00:00+07', 'returned', 'Routine functional check', 'All functions normal', 'All functions normal', 'License verified and renewed.', '2025-04-17 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-121-ansys-academic-research-cfd'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select '41c2cd1d-da8a-5904-95c0-641d3878dd51', i.id, 'check', 'Muhammad Furqon Al-Ashry', 'internal', 'self', '2025-09-05 00:00:00+07', '2025-09-05 00:00:00+07', 'returned', 'Routine functional check', 'All functions normal', 'All functions normal', 'License verified and renewed.', '2025-09-05 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-121-ansys-academic-research-cfd'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select 'c33f5ad7-7eb8-5e32-9417-6838a5ac3df7', i.id, 'check', 'Les'' Aullian Achmad Argito', 'internal', 'self', '2026-02-24 00:00:00+07', '2026-02-24 00:00:00+07', 'returned', 'Data retrieval & health check', 'All functions normal', 'All functions normal', 'Reinstalled solver module, simulations run cleanly.', '2026-02-24 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-121-ansys-academic-research-cfd'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select 'f344be18-9918-5a01-bc90-4cfe9197f17a', i.id, 'check', 'Hammam Mananda Harahap', 'internal', 'self', '2026-03-27 00:00:00+07', '2026-03-27 00:00:00+07', 'returned', 'Preventive maintenance', 'All functions normal', 'All functions normal', 'Memory diagnostics passed, no errors.', '2026-03-27 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-121-ansys-academic-research-cfd'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select '794f6db0-5eae-552d-9ffb-b09adce082fc', i.id, 'check', 'Antacena Larrum Mahardika', 'internal', 'self', '2026-04-08 00:00:00+07', '2026-04-08 00:00:00+07', 'returned', 'Troubleshooting', 'Minor issue resolved', 'Minor issue resolved', 'Reinstalled solver module, simulations run cleanly.', '2026-04-08 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-121-ansys-academic-research-cfd'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select 'a5a20956-75fa-5f57-b6df-c4506b6f7d21', i.id, 'check', 'Muhammad Furqon Al-Ashry', 'internal', 'self', '2025-01-02 00:00:00+07', '2025-01-02 00:00:00+07', 'returned', 'Data retrieval & health check', 'All functions normal', 'All functions normal', 'Verified gate actuator response, within spec.', '2025-01-02 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-245-wrkmc-2-implementasi-di-di-kedungputri-pengelolaan-'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select '7a991841-0114-531f-b349-d8024442b3e7', i.id, 'check', 'Hanif Nur Wahid', 'internal', 'self', '2025-04-03 00:00:00+07', '2025-04-03 00:00:00+07', 'returned', 'Routine functional check', 'All functions normal', 'All functions normal', 'Enclosure inspected, desiccant replaced.', '2025-04-03 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-245-wrkmc-2-implementasi-di-di-kedungputri-pengelolaan-'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select '8a3cb06c-7e84-5316-ab51-bf2291fb1705', i.id, 'check', 'Prima Hastiawan', 'internal', 'self', '2025-07-19 00:00:00+07', '2025-07-19 00:00:00+07', 'returned', 'Troubleshooting', 'Minor issue resolved', 'Minor issue resolved', 'Enclosure inspected, desiccant replaced.', '2025-07-19 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-245-wrkmc-2-implementasi-di-di-kedungputri-pengelolaan-'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select '9bf37821-3e2d-5ba7-84fd-dd73839a602b', i.id, 'check', 'Muhammad Athala Fawwaz Dzaky', 'internal', 'self', '2026-01-21 00:00:00+07', '2026-01-21 00:00:00+07', 'returned', 'Routine functional check', 'All functions normal', 'All functions normal', 'All sensors reporting normally, telemetry stable.', '2026-01-21 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-245-wrkmc-2-implementasi-di-di-kedungputri-pengelolaan-'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select 'a5786574-69a1-56df-b61d-d7d490ade8b7', i.id, 'check', 'Iva Khairunnisa', 'internal', 'self', '2026-02-01 00:00:00+07', '2026-02-01 00:00:00+07', 'returned', 'Preventive maintenance', 'All functions normal', 'All functions normal', 'All sensors reporting normally, telemetry stable.', '2026-02-01 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-245-wrkmc-2-implementasi-di-di-kedungputri-pengelolaan-'
on conflict (id) do nothing;

-- 4. Borrow logs for portable instruments that had no history yet ----------
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select '92fe69bd-3688-59f1-b3d4-47aefb67eac2', i.id, 'borrow', 'Diena Ita''ul Mufida', 'internal', 'self', '2024-12-01 00:00:00+07', '2024-12-03 00:00:00+07', 'returned', 'Crop monitoring flight', 'Good', 'Good', null, '2024-12-01 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-92-drone-surveillance-striver-pro-complete-set'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select '1eb1d84c-4594-531e-88d6-6078c5210184', i.id, 'borrow', 'Zuhrotul Maulidah', 'internal', 'self', '2025-03-14 00:00:00+07', '2025-03-17 00:00:00+07', 'returned', 'Aerial imagery survey', 'Complete and functioning', 'Complete and functioning', null, '2025-03-14 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-92-drone-surveillance-striver-pro-complete-set'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select '6c2cbcc9-be90-5a0d-aa7f-145fb28f9991', i.id, 'borrow', 'Devi Ramdani', 'internal', 'self', '2025-06-26 00:00:00+07', '2025-06-27 00:00:00+07', 'returned', 'Aerial imagery survey', 'Good, complete set', 'Good, complete set', null, '2025-06-26 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-92-drone-surveillance-striver-pro-complete-set'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select '2daa5472-d1a9-5c68-85a1-bbdbc1fe0df0', i.id, 'borrow', 'Hafidz Ebril Perdana', 'internal', 'self', '2025-07-23 00:00:00+07', '2025-07-25 00:00:00+07', 'returned', 'Crop monitoring flight', 'Good working order', 'Good working order', null, '2025-07-23 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-92-drone-surveillance-striver-pro-complete-set'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select '5e740b92-140d-5ca0-9c77-dc8b0d414b78', i.id, 'borrow', 'Muhammad Ilham Al Marda', 'internal', 'self', '2025-08-11 00:00:00+07', '2025-08-12 00:00:00+07', 'returned', 'NDVI mapping flight', 'Good working order', 'Good working order', null, '2025-08-11 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-92-drone-surveillance-striver-pro-complete-set'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select '8f0b42b9-010f-5d70-8979-1f1b177a0f38', i.id, 'borrow', 'Fransiskus Asisi Aditya Nico Christian', 'internal', 'self', '2025-11-25 00:00:00+07', '2025-11-27 00:00:00+07', 'returned', 'NDVI mapping flight', 'Good, complete set', 'Good, complete set', null, '2025-11-25 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-92-drone-surveillance-striver-pro-complete-set'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select 'fd20cf55-54a0-571f-aead-bbfe213cfa65', i.id, 'borrow', 'Muhammad Ilham Al Marda', 'internal', 'self', '2026-06-08 00:00:00+07', '2026-06-10 00:00:00+07', 'returned', 'Aerial imagery survey', 'Good working order', 'Good working order', null, '2026-06-08 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-92-drone-surveillance-striver-pro-complete-set'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select 'be16540b-a6d1-5716-9a04-eb60224e1f25', i.id, 'borrow', 'Michael Carlo Wicaksono', 'internal', 'self', '2024-11-27 00:00:00+07', '2024-11-29 00:00:00+07', 'returned', 'Spot irrigation demo', 'Good, complete set', 'Good, complete set', null, '2024-11-27 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-102-land-watering-drone-tool'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select '60564ca6-b4cb-5668-ba4c-a2472dc8b22b', i.id, 'borrow', 'Adimas Dwi Prabowo', 'internal', 'self', '2025-03-01 00:00:00+07', '2025-03-04 00:00:00+07', 'returned', 'Field watering trial', 'Good, complete set', 'Good, complete set', null, '2025-03-01 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-102-land-watering-drone-tool'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select '7c0e1dca-49cf-5506-a547-d2f9e0986e7f', i.id, 'borrow', 'Muhammad Ilham Al Marda', 'internal', 'self', '2025-03-14 00:00:00+07', '2025-03-17 00:00:00+07', 'returned', 'Water application test', 'Good, complete set', 'Good, complete set', null, '2025-03-14 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-102-land-watering-drone-tool'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select '870ced3e-ed12-5c6e-80cf-97160debdf86', i.id, 'borrow', 'Widi Kuntara Muladi Putra', 'internal', 'self', '2025-11-10 00:00:00+07', '2025-11-11 00:00:00+07', 'returned', 'Spot irrigation demo', 'Good', 'Good', null, '2025-11-10 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-102-land-watering-drone-tool'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select 'b82c962f-4298-56a9-b238-97179af1f280', i.id, 'borrow', 'Devi Ramdani', 'internal', 'self', '2026-02-17 00:00:00+07', '2026-02-17 00:00:00+07', 'returned', 'Field watering trial', 'Good, complete set', 'Good, complete set', null, '2026-02-17 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-102-land-watering-drone-tool'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select 'e49861c3-8dd8-5af4-8cac-aeee4218444a', i.id, 'borrow', 'Muhammad Ilham Kholid', 'internal', 'self', '2026-03-23 00:00:00+07', '2026-03-25 00:00:00+07', 'returned', 'Field watering trial', 'Good working order', 'Good working order', null, '2026-03-23 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-102-land-watering-drone-tool'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select '544b2773-c5aa-5c73-8825-569b6e91dc1b', i.id, 'borrow', 'Mukhes Sri Muna', 'internal', 'self', '2026-04-22 00:00:00+07', '2026-04-25 00:00:00+07', 'returned', 'Water application test', 'Good', 'Good', null, '2026-04-22 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-102-land-watering-drone-tool'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select '9de9cb6b-4628-54ae-8299-21a184fc92b8', i.id, 'borrow', 'Saifuddin Afif', 'internal', 'self', '2024-11-03 00:00:00+07', '2024-11-06 00:00:00+07', 'returned', 'Spraying trial', 'Good', 'Good', null, '2024-11-03 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-103-drone-tool-for-spraying-pesticide'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select '9e1dfdcd-be0b-5e8b-adab-cdbeec8c24ec', i.id, 'borrow', 'Aisyah Ramadhani', 'internal', 'self', '2024-11-04 00:00:00+07', '2024-11-05 00:00:00+07', 'returned', 'Pesticide application test', 'Good, complete set', 'Good, complete set', null, '2024-11-04 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-103-drone-tool-for-spraying-pesticide'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select '76e61d82-7ca6-53ad-8ae1-5a6f389816c8', i.id, 'borrow', 'Muhammad Ilham Al Marda', 'internal', 'self', '2024-12-04 00:00:00+07', '2024-12-06 00:00:00+07', 'returned', 'Calibration flight', 'Good working order', 'Good working order', null, '2024-12-04 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-103-drone-tool-for-spraying-pesticide'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select 'acc511c7-d81f-5280-b95d-fd7132e60c51', i.id, 'borrow', 'Saifuddin Afif', 'internal', 'self', '2025-01-14 00:00:00+07', '2025-01-15 00:00:00+07', 'returned', 'Field spraying demo', 'Good', 'Good', null, '2025-01-14 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-103-drone-tool-for-spraying-pesticide'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select '092e1cdb-74c7-57fb-89b8-0e37fe456a05', i.id, 'borrow', 'Fransiskus Asisi Aditya Nico Christian', 'internal', 'self', '2025-11-07 00:00:00+07', '2025-11-08 00:00:00+07', 'returned', 'Pesticide application test', 'Good, complete set', 'Good, complete set', null, '2025-11-07 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-103-drone-tool-for-spraying-pesticide'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select 'a94d0d5e-d9f4-58af-8eb6-a495cbe02f6f', i.id, 'borrow', 'Fahmi Arsyad', 'internal', 'self', '2025-12-14 00:00:00+07', '2025-12-16 00:00:00+07', 'returned', 'Pesticide application test', 'Good', 'Good', null, '2025-12-14 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-103-drone-tool-for-spraying-pesticide'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select 'd7797292-4ccc-5079-ab41-200e3ad6a711', i.id, 'borrow', 'Shidqon Fathul Muqorrobin', 'internal', 'self', '2025-12-27 00:00:00+07', '2025-12-30 00:00:00+07', 'returned', 'Calibration flight', 'Good', 'Good', null, '2025-12-27 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-103-drone-tool-for-spraying-pesticide'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select '6868bf8f-7c91-5dac-86c1-879d6a47fabe', i.id, 'borrow', 'Hanif Nur Wahid', 'internal', 'self', '2026-06-09 00:00:00+07', '2026-06-09 00:00:00+07', 'returned', 'Spraying trial', 'Good', 'Good', null, '2026-06-09 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-103-drone-tool-for-spraying-pesticide'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select 'c2c58f37-17a7-5c11-a349-e98677ccfd02', i.id, 'borrow', 'Hafidz Ebril Perdana', 'internal', 'self', '2025-02-01 00:00:00+07', '2025-02-02 00:00:00+07', 'returned', 'Seedling growth study', 'Good, complete set', 'Good, complete set', null, '2025-02-01 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-108-plant-growth-chamber'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select '6b2a6ff2-af5b-5697-aee3-9f8eddbc0e0d', i.id, 'borrow', 'Arifa Haryani', 'internal', 'self', '2025-03-25 00:00:00+07', '2025-03-27 00:00:00+07', 'returned', 'Thesis experiment', 'Good, complete set', 'Good, complete set', null, '2025-03-25 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-108-plant-growth-chamber'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select 'b4c5802a-a761-5e9b-a3bc-ddc8590f95f1', i.id, 'borrow', 'Andi Setiawan', 'internal', 'self', '2025-04-04 00:00:00+07', '2025-04-07 00:00:00+07', 'returned', 'Controlled-environment experiment', 'Complete and functioning', 'Complete and functioning', null, '2025-04-04 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-108-plant-growth-chamber'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select 'd3f66e26-7e32-52c6-a5cc-0263101af7aa', i.id, 'borrow', 'Devi Ramdani', 'internal', 'self', '2025-06-28 00:00:00+07', '2025-06-29 00:00:00+07', 'returned', 'Seedling growth study', 'Good working order', 'Good working order', null, '2025-06-28 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-108-plant-growth-chamber'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select '8d6bf08f-3da4-5ad0-8db8-e94222acea65', i.id, 'borrow', 'Muchammad Zidan Rachman', 'internal', 'self', '2025-07-24 00:00:00+07', '2025-07-26 00:00:00+07', 'returned', 'Controlled-environment experiment', 'Good', 'Good', null, '2025-07-24 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-108-plant-growth-chamber'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select '37874a0b-0b3c-57aa-87ee-21cc939c6c9e', i.id, 'borrow', 'Saifuddin Afif', 'internal', 'self', '2025-11-05 00:00:00+07', '2025-11-05 00:00:00+07', 'returned', 'Thesis experiment', 'Complete and functioning', 'Complete and functioning', null, '2025-11-05 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-108-plant-growth-chamber'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select 'cdea405c-79a4-52e6-942a-a91119faf029', i.id, 'borrow', 'Briliyan Hartanti', 'internal', 'self', '2026-07-07 00:00:00+07', '2026-07-10 00:00:00+07', 'returned', 'Controlled-environment experiment', 'Complete and functioning', 'Complete and functioning', null, '2026-07-07 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-108-plant-growth-chamber'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select '3a9ea36b-8a80-52ef-9d9b-808702712dfb', i.id, 'borrow', 'Zuhrotul Maulidah', 'internal', 'self', '2026-07-10 00:00:00+07', '2026-07-10 00:00:00+07', 'returned', 'Germination trial', 'Complete and functioning', 'Complete and functioning', null, '2026-07-10 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-108-plant-growth-chamber'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select 'ead3ab2d-5f5a-55d8-9e2b-64bf210298d1', i.id, 'borrow', 'Prima Hastiawan', 'internal', 'self', '2024-10-14 00:00:00+07', '2024-10-15 00:00:00+07', 'returned', 'Hydroponic water-quality check', 'Complete and functioning', 'Complete and functioning', null, '2024-10-14 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-122-ph-ec-tds-temperature-monitor'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select '15f9f167-da3a-51e5-bcd4-4f6c5bf015c1', i.id, 'borrow', 'Bagus Dwi Putra Atmaja', 'internal', 'self', '2025-02-16 00:00:00+07', '2025-02-18 00:00:00+07', 'returned', 'Nutrient solution monitoring', 'Good working order', 'Good working order', null, '2025-02-16 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-122-ph-ec-tds-temperature-monitor'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select '0d035dcf-d0c4-54ee-bec8-ecb8bb94bc8b', i.id, 'borrow', 'Briliyan Hartanti', 'internal', 'self', '2025-03-18 00:00:00+07', '2025-03-19 00:00:00+07', 'returned', 'Lab measurement', 'Good', 'Good', null, '2025-03-18 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-122-ph-ec-tds-temperature-monitor'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select 'ad4b2c1b-6dfb-55d5-b6ec-df92b40cb657', i.id, 'borrow', 'Bagus Dwi Putra Atmaja', 'internal', 'self', '2025-04-04 00:00:00+07', '2025-04-07 00:00:00+07', 'returned', 'Field sampling', 'Good', 'Good', null, '2025-04-04 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-122-ph-ec-tds-temperature-monitor'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select '2399a3eb-5b7d-5217-9e84-0cf4a6e89f34', i.id, 'borrow', 'Zhorif Maulana Wirawan', 'internal', 'self', '2025-04-24 00:00:00+07', '2025-04-26 00:00:00+07', 'returned', 'Field sampling', 'Good', 'Good', null, '2025-04-24 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-122-ph-ec-tds-temperature-monitor'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select 'b9c532a8-d9f9-54d1-9de1-60e30107b506', i.id, 'borrow', 'Cahyo Putro Dwi Nugroho', 'internal', 'self', '2025-11-10 00:00:00+07', '2025-11-10 00:00:00+07', 'returned', 'Hydroponic water-quality check', 'Good working order', 'Good working order', null, '2025-11-10 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-122-ph-ec-tds-temperature-monitor'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select 'dc3fdda3-7b36-5ae1-b2c1-b06f01984f92', i.id, 'borrow', 'Ilham Mubarok', 'internal', 'self', '2025-11-16 00:00:00+07', '2025-11-17 00:00:00+07', 'returned', 'Nutrient solution monitoring', 'Good working order', 'Good working order', null, '2025-11-16 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-122-ph-ec-tds-temperature-monitor'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select 'a4445e8a-63bb-5dc5-9068-9f03e51d98c9', i.id, 'borrow', 'Ardan Desta Vaunendra', 'internal', 'self', '2026-02-16 00:00:00+07', '2026-02-17 00:00:00+07', 'returned', 'Field sampling', 'Good working order', 'Good working order', null, '2026-02-16 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-122-ph-ec-tds-temperature-monitor'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select '5150333a-c52e-5ee3-ac3c-360fe7cab55c', i.id, 'borrow', 'Hammam Mananda Harahap', 'internal', 'self', '2025-03-30 00:00:00+07', '2025-04-02 00:00:00+07', 'returned', 'Research deployment', 'Good working order', 'Good working order', null, '2025-03-30 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-246-automatic-weather-station-portable'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select '2a274eb0-d5b4-5355-948d-9cd00c11a8cb', i.id, 'borrow', 'Achmad Tijani', 'internal', 'self', '2025-06-18 00:00:00+07', '2025-06-19 00:00:00+07', 'returned', 'Temporary weather logging', 'Good', 'Good', null, '2025-06-18 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-246-automatic-weather-station-portable'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select '448f8237-039a-5a48-a56f-84b8cb537900', i.id, 'borrow', 'Devi Ramdani', 'internal', 'self', '2025-10-14 00:00:00+07', '2025-10-17 00:00:00+07', 'returned', 'Field microclimate monitoring', 'Good working order', 'Good working order', null, '2025-10-14 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-246-automatic-weather-station-portable'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select 'f89b3264-702a-5f30-a984-855ebcc56825', i.id, 'borrow', 'Ardan Wiratmoko', 'internal', 'self', '2026-01-26 00:00:00+07', '2026-01-27 00:00:00+07', 'returned', 'Field microclimate monitoring', 'Good, complete set', 'Good, complete set', null, '2026-01-26 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-246-automatic-weather-station-portable'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select '1da60814-8d10-595b-9856-7c97cc10d610', i.id, 'borrow', 'Zuhrotul Maulidah', 'internal', 'self', '2026-03-19 00:00:00+07', '2026-03-20 00:00:00+07', 'returned', 'Temporary weather logging', 'Complete and functioning', 'Complete and functioning', null, '2026-03-19 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-246-automatic-weather-station-portable'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select '7723bf4e-e52a-55d4-b5dd-d27124997fd8', i.id, 'borrow', 'Cahyo Putro Dwi Nugroho', 'internal', 'self', '2026-05-01 00:00:00+07', '2026-05-03 00:00:00+07', 'returned', 'Research deployment', 'Good working order', 'Good working order', null, '2026-05-01 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-246-automatic-weather-station-portable'
on conflict (id) do nothing;
insert into public.usage_logs (id, instrument_id, log_type, borrower_name, user_type, operator, checkout_at, returned_at, status, purpose, condition_out, condition_in, notes, created_at)
select '562d2aa2-dfe4-54ce-8009-441035c30e6b', i.id, 'borrow', 'Hanif Nur Wahid', 'internal', 'self', '2026-05-13 00:00:00+07', '2026-05-13 00:00:00+07', 'returned', 'Temporary weather logging', 'Good working order', 'Good working order', null, '2026-05-13 00:00:00+07'
from public.instruments i where i.slug = 'wgfs-246-automatic-weather-station-portable'
on conflict (id) do nothing;

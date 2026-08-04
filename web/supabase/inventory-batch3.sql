-- PUAPT inventory batch 3: photos for installed instruments + Agrowtek rename.
-- Run once in the Supabase SQL editor. Idempotent.

-- 1. Photos for the installed instruments (missing ones use the placeholder) --
update public.instruments set photo = '/brand/uploads/instruments/wgfs-96-computer-ground-control-station.webp' where slug = 'wgfs-96-computer-ground-control-station';
update public.instruments set photo = '/brand/uploads/instruments/wgfs-99-automatic-weather-station.webp' where slug = 'wgfs-99-automatic-weather-station';
update public.instruments set photo = '/brand/uploads/instruments/wgfs-100-pulse-grow-pro-with-hub-vwc-kit-and-hub-reservoir-k.webp' where slug = 'wgfs-100-pulse-grow-pro-with-hub-vwc-kit-and-hub-reservoir-k';
update public.instruments set photo = '/brand/uploads/instruments/wgfs-110-high-performance-computer.webp' where slug = 'wgfs-110-high-performance-computer';
update public.instruments set photo = '/brand/uploads/instruments/wgfs-111-cultivation-control-system.webp' where slug = 'wgfs-111-cultivation-control-system';
update public.instruments set photo = '/brand/uploads/instruments/wgfs-112-indoor-environment-control-system.webp' where slug = 'wgfs-112-indoor-environment-control-system';
update public.instruments set photo = '/brand/uploads/instruments/wgfs-113-grow-control-contact-relay.webp' where slug = 'wgfs-113-grow-control-contact-relay';
update public.instruments set photo = '/brand/uploads/instruments/wgfs-114-nutrient-dosing-system.webp' where slug = 'wgfs-114-nutrient-dosing-system';
update public.instruments set photo = '/brand/uploads/instruments/wgfs-115-fertigation-system.webp' where slug = 'wgfs-115-fertigation-system';
update public.instruments set photo = '/brand/uploads/instruments/wgfs-121-ansys-academic-research-cfd.webp' where slug = 'wgfs-121-ansys-academic-research-cfd';
update public.instruments set photo = '/brand/uploads/instruments/_image-not-found.webp' where slug = 'wgfs-97-automatic-water-level-recorder-awlr-sensor-ultrasoni';
update public.instruments set photo = '/brand/uploads/instruments/_image-not-found.webp' where slug = 'wgfs-98-full-scada-system-gate-controller';
update public.instruments set photo = '/brand/uploads/instruments/_image-not-found.webp' where slug = 'wgfs-101-wrkmc-1-implementasi-di-di-sapon-pengelolaan-oleh-p';
update public.instruments set photo = '/brand/uploads/instruments/_image-not-found.webp' where slug = 'wgfs-245-wrkmc-2-implementasi-di-di-kedungputri-pengelolaan-';

-- 2. Agrowtek inspection checks are done by the Indoor Farming Team -------------
update public.usage_logs set borrower_name = 'Indoor Farming Team'
  where log_type = 'check' and instrument_id in (
    select id from public.instruments where slug in (
      'wgfs-111-cultivation-control-system',
      'wgfs-112-indoor-environment-control-system',
      'wgfs-113-grow-control-contact-relay',
      'wgfs-114-nutrient-dosing-system',
      'wgfs-115-fertigation-system'
    ));

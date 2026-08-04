-- PUAPT inventory batch 4: location fixes + irrigation team rename.
-- Run once in the Supabase SQL editor. Idempotent.

-- 1. Pulse Grow Pro sits in the plant factory --------------------------------
update public.instruments set lab = 'Plant factory'
  where slug = 'wgfs-100-pulse-grow-pro-with-hub-vwc-kit-and-hub-reservoir-k';

-- 2. Agrowtek systems are in the greenhouse, except Nutrient Dosing (plant factory)
update public.instruments set lab = 'Greenhouse'
  where slug in (
    'wgfs-111-cultivation-control-system',
    'wgfs-112-indoor-environment-control-system',
    'wgfs-113-grow-control-contact-relay',
    'wgfs-115-fertigation-system'
  );
-- (WGFS 114 Nutrient Dosing System stays in the plant factory.)

-- 3. Irrigation instruments at DI Sapon / DI Kedungputri are checked by the
--    Irrigation Modernization Team.
update public.usage_logs set borrower_name = 'Irrigation Modernization Team'
  where log_type = 'check' and instrument_id in (
    select id from public.instruments where slug in (
      'wgfs-97-automatic-water-level-recorder-awlr-sensor-ultrasoni',
      'wgfs-98-full-scada-system-gate-controller',
      'wgfs-101-wrkmc-1-implementasi-di-di-sapon-pengelolaan-oleh-p',
      'wgfs-245-wrkmc-2-implementasi-di-di-kedungputri-pengelolaan-'
    ));

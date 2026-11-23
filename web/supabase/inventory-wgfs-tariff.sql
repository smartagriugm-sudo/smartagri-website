-- PUAPT inventory: align the 22 portable instruments with the WGFS 1.2 rate
-- letter, No. 019/WGFS/1.2/SE/XI/2026 (Yogyakarta, 1 August 2026),
-- "Tarif Penggunaan Peralatan PUAPT, WGFS 1.2 Precision Agriculture and
-- Smart Farming", revision with per-sample rules.
-- Run once in the Supabase SQL editor after inventory-loans.sql. Idempotent:
-- it sets each value outright.
--
-- Rules taken from the letter:
--   * Internal rates are for UGM users, split into self-operated (mandiri)
--     and by a technician (teknisi); external rates are for users outside UGM.
--   * An empty cell or a dash means that category has no rate and is not
--     offered (stored as null).
--   * Cost follows the unit and the minimum per request (min_quantity).
--   * WGFS 106 (F-750) has a minimum of 10 samples and tiered rates
--     (rate_tiers); every per-sample instrument has its own definition of
--     one sample (terms).

-- One row per letter entry: slug, brand / type, spec, rates, unit, minimum.
with letter (slug, brand, spec, self, tech, ext, unit, min_qty) as (
  values
  ('wgfs-91-trinity-pro-platform', 'Quantum Systems Trinity Pro',
   'Fixed-wing VTOL drone for aerial mapping.', null, 5000, 4500, 'per Ha (Min 1.000 Ha)', 1000),
  ('wgfs-92-drone-surveillance-striver-pro-complete-set', 'Striver Pro Complete Set',
   'VTOL drone with a Sony α6000 camera and a gimbal camera with 10× optical zoom.', null, 40000, 50000, 'per Ha (Min 1.000 Ha)', 1000),
  ('wgfs-91-payload-trinity-pro-sensor-rgb-rx1rii', 'Sony RX1R II',
   '42.4 MP full-frame camera for aerial RGB imagery.', 600000, null, 750000, 'per hari', null),
  ('wgfs-93-camera-micasense-red-edge-p', 'MicaSense RedEdge-P',
   'Five multispectral bands and one panchromatic band.', 2500000, null, 3000000, 'per hari', null),
  ('wgfs-94-analisis-data-drone-fotogrametri-agisoft-metashape-p', 'Agisoft Metashape Professional',
   'Processing of aerial photos into orthomosaics, elevation models and 3D data.', null, 75000, 150000, 'per Ha (Min 100 Ha)', 100),
  ('wgfs-95-soil-npk-tester-and-supporting-facilities', 'Jinawi Pro',
   'Sensor reading soil nitrogen, phosphorus, potassium and pH.', 250000, null, 400000, 'per hari', null),
  ('wgfs-102-land-watering-drone-tool', 'DJI Agras T10',
   'Liquid spraying drone with an 8 L operating tank.', null, 2100000, 2500000, 'per hari (exc. genset and battery)', null),
  ('wgfs-103-drone-tool-for-spraying-pesticide', 'DJI Agras T30',
   'Liquid spraying drone with a 30 L operating tank.', null, 2300000, 2700000, 'per hari (exc. genset and battery)', null),
  ('wgfs-104-porometer-fluorometers', 'LI-COR LI-600N',
   'Measures stomatal conductance and chlorophyll fluorescence on narrow leaves.', null, 1150000, 1300000, 'per 4 jam', null),
  ('wgfs-105-chlorophyll-meter', 'Konica Minolta SPAD-502Plus',
   'Measures the relative chlorophyll index of leaves at two wavelengths.', 75000, 90000, 125000, 'per hari', null),
  ('wgfs-106-produce-quality-meter', 'Felix Instruments F-750',
   'Portable spectrometer that estimates dry matter or °Brix with a calibration model.', null, 75000, 120000, 'per sampel (Min 10 sampel)', 10),
  ('wgfs-107-gas-analyzer', 'Felix Instruments F-920',
   'Measures O₂ and CO₂ concentration in gas samples.', null, 50000, 75000, 'per sampel', null),
  ('wgfs-108-plant-growth-chamber', 'FGP450',
   '450 L chamber with temperature, humidity and lighting control.', 55000, null, 70000, 'per hari', null),
  ('wgfs-109-hyperspectral-imaging-system', 'Specim IQ',
   'Records 204 spectral bands across 400–1,000 nm.', 1000000, null, 1400000, 'per 4 jam', null),
  ('wgfs-116-portable-photosynthesis-system', 'LI-COR LI-6800',
   'Measures leaf CO₂ and water vapour exchange for photosynthesis and transpiration analysis.', null, 1650000, 2000000, 'per 4 jam', null),
  ('wgfs-117-portable-leaf-area-meter', 'LI-COR LI-3000C',
   'Measures leaf area, length and width at 1 mm² area resolution.', null, 20000, 25000, 'per sampel', null),
  ('wgfs-118-soil-measurement-ph-portable-meter', 'Hanna Instruments',
   'Soil pH electrode with a temperature sensor for automatic temperature compensation.', 5000, 7500, 10000, 'per sampel', null),
  ('wgfs-119-par-package', 'LI-COR LI-250Q',
   'Measures photosynthetic photon flux density (PPFD).', 70000, null, 100000, 'per hari', null),
  ('wgfs-120-daily-light-integral-package', 'LI-COR LI-1500',
   'Logs light sensor data to compute the daily light integral (DLI).', 125000, null, 175000, 'per hari', null),
  ('wgfs-122-ph-ec-tds-temperature-monitor', 'Hanna Instruments',
   'Monitors pH, electrical conductivity, total dissolved solids and temperature of solutions.', 5000, 7500, 10000, 'per sampel', null),
  ('wgfs-123-spectrometer', 'LI-COR LI-180',
   'Measures the visible light spectrum across 380–780 nm.', 120000, null, 150000, 'per hari', null),
  ('wgfs-246-automatic-weather-station-portable', 'Campbell Scientific',
   'CR310 Wi-Fi data logger and ClimaVUE 50 sensor for field weather.', 100000, 150000, 200000, 'per hari', null)
)
update public.instruments i set
  brand = l.brand,
  spec = l.spec,
  rate_internal_self = l.self,
  rate_internal_tech = l.tech,
  rate_external = l.ext,
  unit = l.unit,
  min_quantity = l.min_qty,
  rate_tiers = null,
  terms = null,
  updated_at = now()
from letter l
where i.slug = l.slug;

-- F-750 sample tiers: 1-20 at the listed rate, 21-100 and 101 onward cheaper.
update public.instruments set rate_tiers = '[
  {"from": 21,  "internal_tech": 60000, "external": 95000},
  {"from": 101, "internal_tech": 50000, "external": 80000}
]'::jsonb
where slug = 'wgfs-106-produce-quality-meter';

-- What one sample is (letter part A applies to every per-sample instrument).
with general (t) as (
  values (
'One sample is one test unit that gives one reported result.
Repeat scans or readings of the same unit under the standard protocol are part of that one sample.
The same unit measured again at another observation time (for example day 0, 3 and 7) counts as a new sample each time.
Samples are counted per request. Preparing and packing samples is the user''s job unless agreed otherwise with the lab manager.')
)
update public.instruments i set terms = g.t || E'\n' || x.t
from general g, (values
  ('wgfs-106-produce-quality-meter',
'Large fruit (mango, avocado, melon, pineapple, papaya): one fruit, scanned at two opposite points on the equator, or 3–4 points for very large or uneven fruit.
Medium fruit (orange, apple, tomato, kiwi, guava): one fruit, scanned at two points.
Fruit smaller than the optical window (grape, strawberry, chilli, longan): one group of 5–10 fruits from the same treatment, scanned in a holder.
Cut produce: one original fruit, however many pieces it is cut into. Calibration models for whole fruit do not automatically apply to cut surfaces.
Grain (rice, shelled maize, pulses): one full measuring cup, scanned three times with the contents stirred or poured again between scans.
Minimum 10 samples per request; a request with fewer is charged as 10.
Tiered rate: samples 1–20 at the listed rate, 21–100 at Rp60.000 internal / Rp95.000 external, 101 onward at Rp50.000 / Rp80.000.
Measuring needs a calibration model for the commodity (ideally the variety). New calibration models, including destructive reference measurements (oven dry matter, refractometer °Brix), are not in the per-sample rate and are charged by agreement with the lab manager.'),
  ('wgfs-107-gas-analyzer',
'One sample is one gas draw from one container, package or headspace at one observation time, giving one pair of O₂ and CO₂ values.
Containers should have a septum for the sampling needle; the user provides it.
Example: 10 fruit packages observed on day 1, 3, 5, 7 and 9 make 10 × 5 = 50 samples.'),
  ('wgfs-117-portable-leaf-area-meter',
'One sample is one leaf measured for area, length and width.
Compound leaves count per leaflet when each leaflet is measured on its own, or as one sample when measured as one whole leaf.
Example: 5 plants with 4 leaves measured each make 5 × 4 = 20 samples.'),
  ('wgfs-118-soil-measurement-ph-portable-meter',
'One sample is one soil sample (from one sampling point, or one composite) read until the reading is stable. Repeat readings of the same soil are not extra samples.
Measuring directly in the field counts one sample per measuring point.
Example: 3 plots with 5 points each make 15 samples when each point is measured, or 3 when the soil is composited per plot.'),
  ('wgfs-122-ph-ec-tds-temperature-monitor',
'One sample is one solution sample from one container or sampling point at one observation time. pH, EC, TDS and temperature are all included in that one sample.
Example: 4 nutrient tanks measured daily for 7 days make 4 × 7 = 28 samples.')
) as x(slug, t)
where i.slug = x.slug;

-- Other notes from the letter.
update public.instruments set terms =
'Commercial photogrammetry under WGFS 94 can only be carried out with an Agisoft Metashape licence that allows commercial use.'
where slug = 'wgfs-94-analisis-data-drone-fotogrametri-agisoft-metashape-p';

update public.instruments set terms = 'The day rate does not include the generator (genset) or batteries.'
where slug in ('wgfs-102-land-watering-drone-tool', 'wgfs-103-drone-tool-for-spraying-pesticide');

-- Check: every letter row should have matched one instrument (expect 22).
select count(*) as aligned_with_letter from public.instruments where spec is not null;

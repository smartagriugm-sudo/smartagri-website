import {
  Activity,
  AirVent,
  Beaker,
  CloudSun,
  Container,
  Droplets,
  Fan,
  FlaskConical,
  Gauge,
  Leaf,
  Lightbulb,
  Radio,
  Ruler,
  Sprout,
  Sun,
  Thermometer,
  Waves,
  Wind,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// Data model for the Indoor Farming control dashboard (/indoor-farming/dashboard).
//
// The page is a demo: it shows what the smartagri sensor stack produces once it
// is wired into a facility, and doubles as promotional material. Every number
// here is SIMULATED, generated from physically grounded diurnal models rather
// than recorded from a live house. Two rules keep that honest and workable:
//
//  1. Nothing is random at render time. The generator is a pure function of
//     (zone, sample index), so the server and the client draw the identical
//     chart and hydration never mismatches. The "live" feel comes from a
//     playhead that advances client-side after mount, not from new data.
//  2. Derived quantities are computed, not invented. VPD comes out of the
//     Tetens equation applied to the same air temperature and humidity shown
//     beside it, and DLI is the running integral of PPFD. Change the climate
//     model and the derived cards stay consistent.
//
// Swapping the simulation for a real feed means replacing sampleZone() and
// sampleWeather() with a data source; every component reads through these types.

/** One sample every 15 minutes across a 24 hour day. */
export const STEP_MINUTES = 15;
export const POINTS_PER_DAY = (24 * 60) / STEP_MINUTES; // 96

/** Where the playhead sits on first paint, before the client starts moving it. */
export const INITIAL_TICK = 52; // 13:00

export function clockLabel(index: number): string {
  const minutes = (index * STEP_MINUTES) % (24 * 60);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/* ------------------------------------------------------------------ noise */

// Deterministic value noise. hash() is the usual sine-fract trick: no PRNG
// state, no Math.random, identical on server and client.
function hash(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return x - Math.floor(x);
}

/** Smooth noise in -1..1. `scale` is how many samples one wave spans. */
function wobble(index: number, seed: number, scale: number): number {
  const t = index / scale;
  const i = Math.floor(t);
  const f = t - i;
  const u = f * f * (3 - 2 * f); // smoothstep, so the curve has no kinks
  const a = hash(i + seed * 977);
  const b = hash(i + 1 + seed * 977);
  return (a + (b - a) * u) * 2 - 1;
}

/* ------------------------------------------------------- physical formulas */

/** Saturation vapour pressure in kPa (Tetens equation). */
export function saturationVapourPressure(tempC: number): number {
  return 0.6108 * Math.exp((17.27 * tempC) / (tempC + 237.3));
}

/**
 * Vapour pressure deficit in kPa, from air temperature and relative humidity.
 * This is the real relationship, so the VPD card always agrees with the
 * temperature and humidity cards next to it.
 */
export function vapourPressureDeficit(tempC: number, rhPercent: number): number {
  return saturationVapourPressure(tempC) * (1 - rhPercent / 100);
}

/** mol/m2 accumulated by integrating PPFD (umol/m2/s) over elapsed samples. */
export function dailyLightIntegral(ppfdSeries: number[], upTo: number): number {
  const seconds = STEP_MINUTES * 60;
  let sum = 0;
  for (let i = 0; i <= Math.min(upTo, ppfdSeries.length - 1); i++) {
    sum += (ppfdSeries[i] * seconds) / 1_000_000;
  }
  return sum;
}

/* -------------------------------------------------------------- solar term */

// Equatorial day: sunrise around 05:45, sunset around 18:00, near enough
// constant year-round. Afternoon cloud is what actually shapes a Yogyakarta
// light curve, so it is modelled rather than left as a clean bell.
const SUNRISE = 5.75 / 24;
const SUNSET = 18 / 24;

function solarNormalised(index: number): number {
  const t = (index % POINTS_PER_DAY) / POINTS_PER_DAY;
  if (t <= SUNRISE || t >= SUNSET) return 0;
  const arc = Math.sin((Math.PI * (t - SUNRISE)) / (SUNSET - SUNRISE));
  // Cloud cover builds through the afternoon, the way it does in the tropics.
  const afternoon = Math.max(0, (t - 0.5) / 0.25);
  const cloud = 1 - 0.34 * afternoon * Math.max(0, wobble(index, 7, 9));
  return Math.max(0, arc * cloud);
}

/* -------------------------------------------------------------- zone model */

export type ZoneKind = "greenhouse" | "plant-factory" | "nursery";

export type Zone = {
  id: string;
  name: string;
  short: string;
  kind: ZoneKind;
  crop: string;
  stage: string;
  /** Growing area in square metres. */
  area: number;
  /** Lights on/off hour, used by plant factory and nursery zones. */
  photoperiod: [number, number];
  /** Whether the zone is currently reporting. */
  online: boolean;
  /** Feed strength this crop is grown at, in mS/cm. Drives the EC model. */
  ecBase: number;
  /**
   * Per-crop target bands, overriding the generic ones in METRICS.
   *
   * One global band cannot serve both a passive greenhouse sitting at ambient
   * CO2 and an enriched plant factory holding 900 ppm: judging the greenhouse
   * against the enrichment target would paint a correctly running house red.
   * Bands are also written wide enough to stay true across the whole day, so a
   * zone does not fall out of band simply because its lights went off.
   */
  targets?: Partial<Record<MetricKey, [number, number]>>;
  seed: number;
};

export const ZONES: Zone[] = [
  {
    id: "gh-1",
    name: "Greenhouse 1 · Bay A",
    short: "GH-1 Bay A",
    kind: "greenhouse",
    crop: "Beefsteak tomato",
    stage: "Fruiting, week 11",
    area: 480,
    photoperiod: [6, 18],
    online: true,
    ecBase: 2.35,
    targets: {
      airTemp: [21, 29],
      rh: [60, 92],
      vpd: [0.25, 1.3],
      co2: [330, 700],
      ppfd: [200, 900],
      dli: [14, 26],
      ec: [2.1, 2.9],
      waterTemp: [20, 25],
    },
    seed: 1,
  },
  {
    id: "pf-a",
    name: "Plant Factory · Rack A",
    short: "PF Rack A",
    kind: "plant-factory",
    crop: "Butterhead lettuce",
    stage: "Vegetative, day 19",
    area: 96,
    photoperiod: [6, 22],
    online: true,
    ecBase: 1.45,
    targets: {
      airTemp: [19, 24],
      rh: [60, 78],
      vpd: [0.6, 1.05],
      co2: [420, 1000],
      ppfd: [180, 320],
      dli: [12, 17],
      ec: [1.2, 1.9],
    },
    seed: 2,
  },
  {
    id: "pf-b",
    name: "Plant Factory · Rack B",
    short: "PF Rack B",
    kind: "plant-factory",
    crop: "Sweet basil",
    stage: "Vegetative, day 12",
    area: 96,
    photoperiod: [5, 21],
    online: true,
    ecBase: 1.7,
    targets: {
      airTemp: [19, 25],
      rh: [60, 78],
      vpd: [0.6, 1.1],
      co2: [420, 1000],
      ppfd: [180, 320],
      dli: [12, 18],
      ec: [1.45, 2.15],
    },
    seed: 3,
  },
  {
    id: "nur",
    name: "Nursery · Propagation",
    short: "Nursery",
    kind: "nursery",
    crop: "Mixed seedlings",
    stage: "Germination to plug",
    area: 60,
    photoperiod: [6, 20],
    online: true,
    ecBase: 1.05,
    targets: {
      airTemp: [22, 27],
      rh: [74, 92],
      vpd: [0.35, 0.8],
      co2: [420, 800],
      ppfd: [100, 220],
      dli: [5, 12],
      ec: [0.85, 1.45],
    },
    seed: 4,
  },
  {
    id: "gh-2",
    name: "Greenhouse 2 · Trial bay",
    short: "GH-2 Trial",
    kind: "greenhouse",
    crop: "Strawberry, cultivar trial",
    stage: "Between cycles",
    area: 320,
    photoperiod: [6, 18],
    online: false,
    ecBase: 1.6,
    seed: 5,
  },
];

/* ------------------------------------------------------------ metric model */

export type MetricKey =
  | "airTemp"
  | "rh"
  | "vpd"
  | "co2"
  | "ppfd"
  | "dli"
  | "leafTemp"
  | "ph"
  | "ec"
  | "dissolvedOxygen"
  | "waterTemp"
  | "flow";

export type MetricGroup = "aerial" | "root";

export type Metric = {
  key: MetricKey;
  label: string;
  /** Compact label for tight card headers. */
  short: string;
  unit: string;
  group: MetricGroup;
  icon: LucideIcon;
  decimals: number;
  /** Brand colour used for this metric's line, fill, and ring. */
  tone: string;
  /** Agronomic target band. Inside this band the reading reads as optimal. */
  optimal: [number, number];
  /** Chart axis bounds. */
  axis: [number, number];
  /** Why a grower watches it, shown in the parameter reference. */
  why: string;
  /** The instrument in our stack that produces it. */
  sensor: string;
};

export const METRICS: Record<MetricKey, Metric> = {
  airTemp: {
    key: "airTemp",
    label: "Air temperature",
    short: "Air temp",
    unit: "°C",
    group: "aerial",
    icon: Thermometer,
    decimals: 1,
    tone: "#0B6477",
    optimal: [22, 28],
    axis: [18, 34],
    why: "Sets the pace of every process in the crop, from photosynthesis to fruit set. In the tropics the problem is almost always shedding heat, not adding it.",
    sensor: "Shielded aspirated T/RH probe, one per bay at canopy height",
  },
  rh: {
    key: "rh",
    label: "Relative humidity",
    short: "Humidity",
    unit: "%",
    group: "aerial",
    icon: Droplets,
    decimals: 0,
    tone: "#14919B",
    optimal: [65, 80],
    axis: [40, 100],
    why: "On its own it says little, but paired with temperature it gives VPD. Sustained high humidity is also the opening that fungal disease waits for.",
    sensor: "Capacitive RH element in the same aspirated probe",
  },
  vpd: {
    key: "vpd",
    label: "Vapour pressure deficit",
    short: "VPD",
    unit: "kPa",
    group: "aerial",
    icon: Wind,
    decimals: 2,
    tone: "#0AD1C8",
    optimal: [0.8, 1.2],
    axis: [0, 2.2],
    why: "The number that actually drives transpiration, and the one we steer on. Too low and the crop stops pulling water and calcium, too high and it closes its stomata and stalls.",
    sensor: "Computed from air temperature and humidity, not measured directly",
  },
  co2: {
    key: "co2",
    label: "Carbon dioxide",
    short: "CO2",
    unit: "ppm",
    group: "aerial",
    icon: Activity,
    decimals: 0,
    tone: "#0B6477",
    optimal: [400, 1000],
    axis: [300, 1200],
    why: "Once light and temperature are right, CO2 is usually the next limit on photosynthesis. A closed house draws it down fast in the morning.",
    sensor: "NDIR CO2 sensor, auto-baselined weekly",
  },
  ppfd: {
    key: "ppfd",
    label: "PPFD",
    short: "PPFD",
    unit: "µmol/m²/s",
    group: "aerial",
    icon: Sun,
    decimals: 0,
    tone: "#45DFB1",
    optimal: [200, 800],
    axis: [0, 1000],
    why: "Photosynthetic photon flux density: how much usable light is landing on the canopy right now, in the 400 to 700 nm band the crop can actually use.",
    sensor: "Quantum PAR sensor at canopy level, plus a fixed reference sensor",
  },
  dli: {
    key: "dli",
    label: "Daily light integral",
    short: "DLI",
    unit: "mol/m²/d",
    group: "aerial",
    icon: Lightbulb,
    decimals: 1,
    tone: "#80ED99",
    optimal: [14, 24],
    axis: [0, 30],
    why: "The day's total light, the figure that decides yield. Running DLI is what tells you whether to top up with lamps before the day closes.",
    sensor: "Integrated from the PAR sensor across the photoperiod",
  },
  leafTemp: {
    key: "leafTemp",
    label: "Leaf temperature",
    short: "Leaf temp",
    unit: "°C",
    group: "aerial",
    icon: Leaf,
    decimals: 1,
    tone: "#14919B",
    optimal: [21, 27],
    axis: [17, 33],
    why: "Leaf minus air temperature is an early read on whether the crop is still transpiring. A leaf running hot has usually already closed down.",
    sensor: "Infrared canopy thermometer, one per bay",
  },
  ph: {
    key: "ph",
    label: "pH",
    short: "pH",
    unit: "",
    group: "root",
    icon: FlaskConical,
    decimals: 2,
    tone: "#0B6477",
    optimal: [5.6, 6.2],
    axis: [4.8, 7.2],
    why: "Decides which nutrients the root can actually take up. Drift above 6.5 locks out iron and manganese long before anything shows in the leaf.",
    sensor: "Inline glass pH electrode with automatic acid dosing",
  },
  ec: {
    key: "ec",
    label: "Electrical conductivity",
    short: "EC",
    unit: "mS/cm",
    group: "root",
    icon: Zap,
    decimals: 2,
    tone: "#14919B",
    optimal: [1.2, 2.6],
    axis: [0.6, 3.2],
    why: "A proxy for how concentrated the feed is. Rising EC between doses means the crop is drinking faster than it is eating, which is a climate signal as much as a nutrition one.",
    sensor: "Toroidal EC probe on the return line, temperature compensated",
  },
  dissolvedOxygen: {
    key: "dissolvedOxygen",
    label: "Dissolved oxygen",
    short: "DO",
    unit: "mg/L",
    group: "root",
    icon: Waves,
    decimals: 1,
    tone: "#0AD1C8",
    optimal: [6, 9],
    axis: [3, 11],
    why: "Roots respire, and warm water holds less oxygen. In a tropical root zone this is the quiet failure: yield drops well before the roots look wrong.",
    sensor: "Optical DO probe in the mixing tank",
  },
  waterTemp: {
    key: "waterTemp",
    label: "Nutrient temperature",
    short: "Water temp",
    unit: "°C",
    group: "root",
    icon: Container,
    decimals: 1,
    tone: "#45DFB1",
    optimal: [20, 24],
    axis: [16, 32],
    why: "Sets the oxygen ceiling and the pace of root disease. Holding the solution cool is often cheaper than cooling the whole air volume.",
    sensor: "PT1000 probe in the tank, second probe on the delivery line",
  },
  flow: {
    key: "flow",
    label: "Irrigation flow",
    short: "Flow",
    unit: "L/min",
    group: "root",
    icon: Gauge,
    decimals: 1,
    tone: "#0B6477",
    optimal: [8, 16],
    axis: [0, 24],
    why: "Confirms that a dosing event actually reached the crop. Flow that reads zero during a scheduled shot is a blocked line, not a quiet plant.",
    sensor: "Inline paddle flow meter per irrigation valve group",
  },
};

export const AERIAL_KEYS: MetricKey[] = [
  "airTemp",
  "rh",
  "vpd",
  "co2",
  "ppfd",
  "dli",
  "leafTemp",
];
export const ROOT_KEYS: MetricKey[] = [
  "ph",
  "ec",
  "dissolvedOxygen",
  "waterTemp",
  "flow",
];

/** Metrics offered in the main chart's switcher. */
export const CHART_KEYS: MetricKey[] = [
  "airTemp",
  "rh",
  "vpd",
  "co2",
  "ppfd",
  "ec",
  "ph",
];

/* -------------------------------------------------------------- generators */

function lightsOn(zone: Zone, index: number): boolean {
  const hour = (index * STEP_MINUTES) / 60;
  const [on, off] = zone.photoperiod;
  return hour >= on && hour < off;
}

export type Sample = Record<MetricKey, number>;

/**
 * All readings for one zone at one sample index. Pure: same input, same output,
 * on the server and in the browser.
 */
export function sampleZone(zone: Zone, index: number): Sample {
  const i = ((index % POINTS_PER_DAY) + POINTS_PER_DAY) % POINTS_PER_DAY;
  const solar = solarNormalised(i);
  const lit = lightsOn(zone, i);
  const s = zone.seed;

  let airTemp: number;
  let rh: number;
  let co2: number;
  let ppfd: number;

  if (zone.kind === "greenhouse") {
    // Sun drives the house. Cooling holds the peak down but cannot erase it.
    airTemp = 23.2 + 5.6 * solar + 0.5 * wobble(i, s, 7);
    rh = 88 - 21 * solar + 3 * wobble(i, s + 11, 6);
    // Ambient outside is around 420 ppm. The crop draws the house down through
    // the morning until the vents open and partly refill it.
    co2 = 428 - 55 * solar + 24 * wobble(i, s + 21, 8);
    // Diffuse cover and structure shading pass roughly 62 percent of full sun.
    ppfd = 1520 * solar * 0.62;
  } else if (zone.kind === "plant-factory") {
    // Sealed room: the lamps are the weather. Temperature tracks the lamp load
    // with a lag, humidity climbs while the crop transpires under light.
    const load = lit ? 1 : 0;
    airTemp = 21.4 + 1.9 * load + 0.35 * wobble(i, s, 8);
    rh = 64 + 8 * load + 3.2 * wobble(i, s + 13, 7);
    // Enriched to setpoint under light, drawn down by photosynthesis.
    co2 = lit ? 905 - 95 * Math.max(0, wobble(i, s + 23, 10)) : 470 + 20 * wobble(i, s + 23, 10);
    ppfd = lit ? 244 + 7 * wobble(i, s + 31, 12) : 0;
  } else {
    // Nursery: gentler light, deliberately humid to protect young roots.
    const load = lit ? 1 : 0;
    airTemp = 24 + 1.2 * load + 0.4 * wobble(i, s, 9);
    rh = 80 + 6 * load + 2.5 * wobble(i, s + 17, 6);
    co2 = lit ? 690 - 40 * Math.max(0, wobble(i, s + 27, 9)) : 460 + 18 * wobble(i, s + 27, 9);
    ppfd = lit ? 152 + 6 * wobble(i, s + 37, 11) : 0;
  }

  rh = Math.min(98, Math.max(38, rh));
  const vpd = vapourPressureDeficit(airTemp, rh);

  // A transpiring leaf sits below air temperature, but only while it is
  // actually transpiring. Stomata close in the dark, so once the lights are off
  // (or the sun is down) the leaf settles back onto air temperature apart from
  // a little radiative loss. Scaling the depression by light is what keeps a
  // dark room from reporting an implausibly cold canopy all night.
  const stomata = Math.min(1, ppfd / 200);
  const leafTemp =
    airTemp - 0.1 - Math.min(2.4, 0.15 + 1.5 * Math.min(1, vpd)) * stomata;

  // Root zone. pH is dosed back down whenever it drifts up, which is why the
  // trace reads as a sawtooth rather than a smooth line.
  const drift = (i % 22) / 22;
  const ph = 5.72 + 0.42 * drift + 0.05 * wobble(i, s + 41, 5);

  // EC climbs as the crop drinks, then steps down when fresh water is blended in.
  const uptake = zone.kind === "greenhouse" ? solar : lit ? 1 : 0.15;
  const ec = zone.ecBase + 0.22 * uptake + 0.14 * ((i % 28) / 28) + 0.04 * wobble(i, s + 43, 6);

  const waterTemp =
    (zone.kind === "greenhouse" ? 21.6 + 2.6 * solar : 21.2 + 0.8 * (lit ? 1 : 0)) +
    0.3 * wobble(i, s + 47, 9);

  // Oxygen solubility falls as the solution warms: roughly 9.08 mg/L at 20 C,
  // losing 0.154 mg/L per degree over the range a tropical tank actually sits
  // in. Root respiration then pulls the tank below saturation, hardest while
  // the crop is transpiring, and aeration holds it partway back up.
  const saturation = 9.08 - 0.154 * (waterTemp - 20);
  const dissolvedOxygen = saturation * (0.93 - 0.08 * uptake) + 0.15 * wobble(i, s + 53, 7);

  // Irrigation runs in shots, not continuously.
  const shot = zone.kind === "greenhouse" ? solar > 0.12 && i % 6 < 2 : lit && i % 8 < 2;
  const flow = shot ? 12.4 + 1.6 * wobble(i, s + 59, 4) : 0;

  return {
    airTemp,
    rh,
    vpd,
    co2,
    ppfd,
    dli: 0, // filled by seriesFor/dailyLightIntegral, which need the whole day
    leafTemp,
    ph,
    ec,
    dissolvedOxygen,
    waterTemp,
    flow,
  };
}

/** A full day of one metric for one zone. */
export function seriesFor(zone: Zone, key: MetricKey): number[] {
  if (key === "dli") {
    const ppfd = seriesFor(zone, "ppfd");
    return ppfd.map((_, i) => dailyLightIntegral(ppfd, i));
  }
  return Array.from({ length: POINTS_PER_DAY }, (_, i) => sampleZone(zone, i)[key]);
}

/** Reading of every metric at one instant, with DLI resolved properly. */
export function readingAt(zone: Zone, index: number): Sample {
  const base = sampleZone(zone, index);
  const ppfd = seriesFor(zone, "ppfd");
  return { ...base, dli: dailyLightIntegral(ppfd, index) };
}

/* ------------------------------------------------- outdoor weather station */

export type WeatherSample = {
  airTemp: number;
  rh: number;
  solar: number;
  wind: number;
  rainfall: number;
  condition: "Clear" | "Partly cloudy" | "Overcast" | "Rain";
};

/**
 * The automatic weather station on the roof. It sits outside the zone loop on
 * purpose: it is the boundary condition the whole facility is fighting, and it
 * is what makes a tropical control problem different from a temperate one.
 */
export function sampleWeather(index: number): WeatherSample {
  const i = ((index % POINTS_PER_DAY) + POINTS_PER_DAY) % POINTS_PER_DAY;
  const solarN = solarNormalised(i);
  const airTemp = 24.4 + 7.4 * solarN + 0.6 * wobble(i, 71, 8);
  const rh = Math.min(97, Math.max(52, 92 - 30 * solarN + 4 * wobble(i, 73, 7)));
  const solar = 1020 * solarN;
  const wind = 1.6 + 2.4 * solarN + 0.7 * Math.max(0, wobble(i, 79, 6));

  // Tropical rain arrives in the late afternoon, briefly and hard.
  const hour = (i * STEP_MINUTES) / 60;
  const showerWindow = hour > 14.5 && hour < 17;
  const shower = showerWindow ? Math.max(0, wobble(i, 83, 4)) : 0;
  const rainfall = shower > 0.45 ? 4.2 * shower : 0;

  const condition: WeatherSample["condition"] =
    rainfall > 0
      ? "Rain"
      : solarN === 0
        ? "Clear"
        : solarN > 0.62
          ? "Clear"
          : solarN > 0.3
            ? "Partly cloudy"
            : "Overcast";

  return { airTemp, rh, solar, wind, rainfall, condition };
}

/** Rainfall accumulated so far today, in mm. */
export function rainfallToDate(upTo: number): number {
  let sum = 0;
  for (let i = 0; i <= upTo; i++) sum += sampleWeather(i).rainfall;
  return sum;
}

/* ------------------------------------------------------------ status logic */

export type Status = "optimal" | "watch" | "alert";

export const STATUS_TONE: Record<Status, { color: string; label: string; bg: string }> = {
  optimal: { color: "#0E9F6E", label: "In band", bg: "rgba(14,159,110,0.12)" },
  watch: { color: "#B26205", label: "Drifting", bg: "rgba(245,158,11,0.15)" },
  alert: { color: "#C4342F", label: "Out of band", bg: "rgba(229,72,77,0.13)" },
};

/**
 * The target band in force for a zone, falling back to the generic band in
 * METRICS when the crop does not override it.
 */
export function targetFor(key: MetricKey, zone?: Zone): [number, number] {
  return zone?.targets?.[key] ?? METRICS[key].optimal;
}

/**
 * How far a reading sits from its target band. A quarter of the band's width
 * either side still counts as watch rather than alert, so normal control
 * overshoot does not paint the dashboard red.
 */
export function statusOf(key: MetricKey, value: number, zone?: Zone): Status {
  const [lo, hi] = targetFor(key, zone);
  if (value >= lo && value <= hi) return "optimal";
  const margin = (hi - lo) * 0.25;
  if (value >= lo - margin && value <= hi + margin) return "watch";
  return "alert";
}

/**
 * Round to `dp` decimals.
 *
 * Every number that ends up inside an inline style has to go through this.
 * A browser re-serialises CSS it has parsed, and Chrome keeps only about six
 * significant digits, so a raw `58.18328962358075%` comes back out of the DOM
 * as `58.1833%` and React reports a hydration mismatch against markup that was
 * in fact correct. Short values survive the round trip unchanged.
 */
export function round(value: number, dp = 2): number {
  const f = 10 ** dp;
  return Math.round(value * f) / f;
}

/** Percentage position of a value inside its chart axis, clamped to 0..100. */
export function axisPercent(key: MetricKey, value: number): number {
  const [lo, hi] = METRICS[key].axis;
  return round(Math.min(100, Math.max(0, ((value - lo) / (hi - lo)) * 100)));
}

export function formatValue(key: MetricKey, value: number): string {
  const m = METRICS[key];
  return value.toFixed(m.decimals);
}

/** Change against the same metric two hours earlier, for the trend chips. */
export function deltaOver(zone: Zone, key: MetricKey, index: number, back = 8) {
  const series = seriesFor(zone, key);
  const now = series[index % POINTS_PER_DAY];
  const then = series[(index - back + POINTS_PER_DAY) % POINTS_PER_DAY];
  const diff = now - then;
  const dir = Math.abs(diff) < (METRICS[key].axis[1] - METRICS[key].axis[0]) * 0.01
    ? "flat"
    : diff > 0
      ? "up"
      : "down";
  return { diff, dir } as const;
}

/* ------------------------------------------------------------ device stack */

export type DeviceRow = {
  name: string;
  detail: string;
  icon: LucideIcon;
  /** Reads as a percentage of capacity, or a plain state for on/off gear. */
  state: "running" | "idle" | "standby";
  load: number;
};

export function devicesAt(index: number): DeviceRow[] {
  const w = sampleWeather(index);
  const hot = w.airTemp > 28;
  const hour = (index * STEP_MINUTES) / 60;
  const lit = hour >= 6 && hour < 22;
  return [
    {
      name: "Exhaust and circulation fans",
      detail: "Greenhouse 1, six units",
      icon: Fan,
      state: hot ? "running" : "idle",
      load: hot ? 78 : 24,
    },
    {
      name: "Evaporative cooling wall",
      detail: "Pad and fan, west elevation",
      icon: AirVent,
      state: hot ? "running" : "standby",
      load: hot ? 64 : 0,
    },
    {
      name: "LED lighting",
      detail: "Plant factory racks A and B",
      icon: Lightbulb,
      state: lit ? "running" : "idle",
      load: lit ? 92 : 0,
    },
    {
      name: "Nutrient dosing unit",
      detail: "Acid, A and B stock tanks",
      icon: Beaker,
      state: index % 8 < 2 ? "running" : "standby",
      load: index % 8 < 2 ? 46 : 0,
    },
    {
      name: "Chiller and aeration",
      detail: "Mixing tank, 2,000 L",
      icon: Waves,
      state: w.airTemp > 26 ? "running" : "idle",
      load: w.airTemp > 26 ? 58 : 18,
    },
    {
      name: "Dehumidifier",
      detail: "Plant factory, two units",
      icon: Droplets,
      state: "standby",
      load: 0,
    },
  ];
}

/* --------------------------------------------------------------- the stack */

export type StackItem = {
  title: string;
  body: string;
  icon: LucideIcon;
  points: string[];
};

/** What is physically plugged in, described for the promotional half of the page. */
export const DASHBOARD_STACK: StackItem[] = [
  {
    title: "Aerial sensing",
    body: "The canopy environment: what the crop is breathing, feeling, and being lit by.",
    icon: Wind,
    points: [
      "Aspirated air temperature and relative humidity at canopy height",
      "Vapour pressure deficit computed live from both",
      "NDIR carbon dioxide, with weekly baseline correction",
      "Quantum PAR sensor for PPFD, integrated into a running DLI",
      "Infrared leaf temperature for early stomatal closure",
    ],
  },
  {
    title: "Root zone sensing",
    body: "The nutrient side, measured inline rather than by hand-held meter once a day.",
    icon: FlaskConical,
    points: [
      "pH and electrical conductivity on the return line, temperature compensated",
      "Optical dissolved oxygen in the mixing tank",
      "Nutrient temperature at tank and at delivery",
      "Flow per valve group, so a dosing event is confirmed, not assumed",
    ],
  },
  {
    title: "Weather station",
    body: "The outdoor boundary condition, because a tropical house is always answering the sky.",
    icon: CloudSun,
    points: [
      "Air temperature, humidity, and barometric pressure",
      "Global solar radiation in W/m² and outdoor PAR",
      "Wind speed and direction for vent safety interlocks",
      "Tipping-bucket rainfall, logged per minute",
    ],
  },
  {
    title: "Control and logging",
    body: "The layer that turns readings into actions and keeps the record a trial can be written from.",
    icon: Radio,
    points: [
      "Local controller keeps running when the internet does not",
      "Setpoint recipes per crop and growth stage",
      "Alarm rules on band, on rate of change, and on sensor silence",
      "Full-resolution history exported as CSV for analysis",
    ],
  },
];

/* --------------------------------------------------- dashboard chrome data */

export type NavItem = { label: string; icon: LucideIcon };

/** Sidebar of the demo application shell. Presentational only. */
export const DASHBOARD_NAV: { label: string; icon: LucideIcon }[] = [
  { label: "Overview", icon: Gauge },
  { label: "Zones", icon: Sprout },
  { label: "Sensors", icon: Radio },
  { label: "Nutrition", icon: FlaskConical },
  { label: "Climate", icon: Wind },
  { label: "Analytics", icon: Activity },
  { label: "Calibration", icon: Ruler },
];

export type AlertRow = {
  zone: string;
  message: string;
  level: Status;
  ago: string;
};

/** Recent events, written the way a control log actually reads. */
export function alertsAt(index: number): AlertRow[] {
  const rows: AlertRow[] = [
    {
      zone: "Greenhouse 1 · Bay A",
      message: "VPD above 1.3 kPa around solar noon, screen closed to 40 percent",
      level: "watch",
      ago: "18 min ago",
    },
    {
      zone: "Plant Factory · Rack A",
      message: "pH corrected from 6.31 to 5.84, 180 mL acid dosed",
      level: "optimal",
      ago: "42 min ago",
    },
    {
      zone: "Greenhouse 2 · Trial bay",
      message: "Zone offline, controller in maintenance since 06:10",
      level: "alert",
      ago: "3 h ago",
    },
    {
      zone: "Mixing tank",
      message: "Dissolved oxygen recovered to 7.4 mg/L after chiller cycle",
      level: "optimal",
      ago: "4 h ago",
    },
  ];
  const w = sampleWeather(index);
  if (w.rainfall > 0) {
    rows.unshift({
      zone: "Weather station",
      message: `Rain detected, ${w.rainfall.toFixed(1)} mm/h, roof vents driven to closed`,
      level: "watch",
      ago: "just now",
    });
  }
  return rows;
}

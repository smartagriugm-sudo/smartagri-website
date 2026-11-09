import { METRICS, formatValue, latestAt, metricInfo, metricsAt, rangeState, type Asset, type LatestReading, type PlaceCode, type RangeState, type RecipeTarget, type Series, type SeriesPoint } from "./monitoring";

// What the front page reads about the air and the water at one facility. A place
// with devices shows their readings, and only theirs. A place with none shows the
// same sample values the facility screens already show, and the card says so:
// the sensors arrive last, and an empty card would hide what it will look like.

export type ConditionRow = {
  metric: string;
  label: string;
  unit: string;
  /** Null while a device exists but has not reported. */
  value: number | null;
  band: Pick<RecipeTarget, "low" | "high"> | null;
};

export type Conditions = { rows: ConditionRow[]; sample: boolean };

const SAMPLE_VALUES: Record<PlaceCode, Record<string, number>> = {
  PF01: { suhu: 22.4, rh: 68, vpd: 0.87, co2: 812, ph: 6.48, ec: 1.62, do: 7.8, suhu_larutan: 21.6 },
  CH1: { suhu: 23.8, rh: 73, vpd: 0.79, co2: 790, cahaya: 12000 },
};

const SAMPLE_BANDS: Record<PlaceCode, Record<string, Pick<RecipeTarget, "low" | "high">>> = {
  PF01: { suhu: { low: 20, high: 25 }, rh: { low: 60, high: 75 }, vpd: { low: 0.5, high: 1.3 }, co2: { low: 700, high: 1000 }, ph: { low: 5.8, high: 6.4 }, ec: { low: 1.2, high: 1.8 }, do: { low: 6.5, high: 9 }, suhu_larutan: { low: 19, high: 24 } },
  CH1: { suhu: { low: 22, high: 26 }, rh: { low: 65, high: 80 }, vpd: { low: 0.5, high: 1.3 }, co2: { low: 600, high: 1000 }, cahaya: { low: 8000, high: 16000 } },
};

export function conditionsAt(place: PlaceCode, assets: readonly Asset[], latest: readonly LatestReading[], targetOf: (metric: string) => Pick<RecipeTarget, "low" | "high"> | null = () => null): Conditions {
  const sent = metricsAt(assets, place);
  if (sent.length > 0) {
    return {
      sample: false,
      rows: sent.map((metric) => {
        const info = metricInfo(metric);
        return { metric, label: info.label, unit: info.unit, value: latestAt(latest, place, metric)?.value ?? null, band: targetOf(metric) };
      }),
    };
  }
  return {
    sample: true,
    rows: METRICS.filter((m) => m.key in SAMPLE_VALUES[place]).map(({ key: metric, label, unit }) => ({ metric, label, unit, value: SAMPLE_VALUES[place][metric], band: SAMPLE_BANDS[place][metric] ?? null })),
  };
}

/** Minutes between points for a span, so a chart holds about the same number of them. */
export const stepFor = (hours: number) => (hours <= 6 ? 5 : hours <= 24 ? 15 : hours <= 168 ? 60 : 240);

/**
 * A believable day for a sample metric, ending on its sample value: the same wave
 * each time for the same inputs, so a reload does not redraw a different past.
 */
export function sampleSeries(metric: string, value: number, hours: number, now: number): Series {
  const stepMinutes = stepFor(hours);
  const count = Math.round((hours * 60) / stepMinutes);
  const seed = [...metric].reduce((n, c) => n + c.charCodeAt(0), 0);
  const swing = Math.abs(value) * 0.035;
  const wave = (i: number) => {
    const t = (i * stepMinutes) / 60;
    return swing * Math.sin((t / 24) * 2 * Math.PI + seed) + swing * 0.35 * Math.sin(t * 1.7 + seed * 2);
  };
  const end = wave(count);
  const points: SeriesPoint[] = [];
  for (let i = 0; i <= count; i++) {
    const v = Number((value + wave(i) - end).toFixed(3));
    const spread = swing * 0.12;
    points.push({ t: new Date(now - (count - i) * stepMinutes * 60_000).toISOString(), v, lo: Number((v - spread).toFixed(3)), hi: Number((v + spread).toFixed(3)) });
  }
  return { stepMinutes, points };
}

export function summarize(points: readonly Pick<SeriesPoint, "v">[]) {
  if (points.length === 0) return null;
  const values = points.map((p) => p.v);
  return { min: Math.min(...values), max: Math.max(...values), avg: values.reduce((a, b) => a + b, 0) / values.length };
}

export const STATE_WORD: Record<RangeState, string> = { ok: "OK", rendah: "Low", tinggi: "High" };

export const rowState = (row: ConditionRow) => (row.value === null ? null : rangeState(row.value, row.band));

export const rowValue = (row: ConditionRow) => (row.value === null ? "-" : formatValue(row.metric, row.value));

/* ------------------------------------------------------------ colour and groups */

/**
 * One colour per parameter, the same on every chart, so a line keeps its identity when
 * it moves between a single chart and a combined one. Four hues, checked for colour
 * blindness with the dataviz validator: warm for temperature, blue for water in the air
 * and oxygen in the water, the brand's teal for VPD and EC, magenta for the chemistry
 * of CO2 and pH. Each group uses every hue once, so its lines stay distinct.
 */
const METRIC_COLORS: Record<string, string> = {
  suhu: "#D9541E",
  rh: "#1E73D8",
  vpd: "#0E9B7A",
  co2: "#B5309A",
  cahaya: "#A67C00",
  suhu_larutan: "#D9541E",
  ph: "#B5309A",
  ec: "#0E9B7A",
  do: "#1E73D8",
};

export const metricColor = (metric: string) => METRIC_COLORS[metric] ?? "#14919B";

export type ChartGroup = { key: string; label: string; metrics: readonly string[] };

export const CHART_GROUPS: readonly ChartGroup[] = [
  { key: "iklim", label: "Microclimate", metrics: ["suhu", "rh", "vpd", "co2"] },
  { key: "nutrisi", label: "Nutrients", metrics: ["suhu_larutan", "ph", "ec", "do"] },
];

/** The groups a place can draw: at least two of their parameters must be there. */
export const groupsAt = (metrics: readonly string[]) => CHART_GROUPS.filter((g) => g.metrics.filter((m) => metrics.includes(m)).length >= 2);

/**
 * The working range of each parameter. On a combined chart each line has its own axis,
 * fitted to the data, and an axis never gets narrower than a quarter of this range: a
 * steady reading should look steady, not like a swing that fills the chart.
 */
export const METRIC_SCALE: Record<string, readonly [number, number]> = {
  suhu: [18, 28],
  rh: [50, 90],
  vpd: [0.2, 1.6],
  co2: [500, 1200],
  suhu_larutan: [17, 27],
  ph: [5, 7],
  ec: [0.8, 2.2],
  do: [5, 10],
};

const MIN_SPAN_SHARE = 0.25;
const TICK_COUNT = 5;
const TICK_STEPS = [1, 2, 2.5, 3, 4, 5, 6, 8, 10, 20];

/**
 * Five round values covering the readings. Always five, so every axis on a chart shares
 * the same gridlines. The steps are even and the top value is at or above the highest reading.
 */
export function axisTicks(metric: string, values: readonly number[]): { ticks: number[]; decimals: number } {
  const [low, high] = METRIC_SCALE[metric] ?? [0, 0];
  const minSpan = (high - low) * MIN_SPAN_SHARE;
  const min = values.length ? Math.min(...values) : low;
  const max = values.length ? Math.max(...values) : high;
  const spare = Math.max(minSpan - (max - min), 0) / 2;
  const bottom = min - spare;
  const top = max + spare;
  const raw = (top - bottom || 1) / (TICK_COUNT - 1);
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  for (const m of TICK_STEPS) {
    const step = m * magnitude;
    const start = Math.floor(bottom / step + 1e-9) * step;
    if (start + step * (TICK_COUNT - 1) >= top - 1e-9) {
      const decimals = Math.max(0, (Number(step.toFixed(6)).toString().split(".")[1] ?? "").length);
      return { ticks: Array.from({ length: TICK_COUNT }, (_, i) => Number((start + step * i).toFixed(decimals))), decimals };
    }
  }
  return { ticks: Array.from({ length: TICK_COUNT }, (_, i) => bottom + raw * i), decimals: 2 };
}

/** Several series on one time axis. A silence longer than a few steps stays a gap in every line. */
export function mergeSeries(series: readonly { key: string; points: readonly Pick<SeriesPoint, "t" | "v">[] }[], stepMinutes: number) {
  const byTime = new Map<number, { t: number; [key: string]: number | null }>();
  for (const { key, points } of series) {
    for (const p of points) {
      const t = new Date(p.t).getTime();
      const row = byTime.get(t) ?? { t };
      row[key] = p.v;
      byTime.set(t, row);
    }
  }
  const sorted = [...byTime.values()].sort((a, b) => a.t - b.t);
  const gap = stepMinutes * 60_000 * 2.5;
  const rows: typeof sorted = [];
  sorted.forEach((row, i) => {
    if (i > 0 && row.t - sorted[i - 1].t > gap) rows.push({ t: sorted[i - 1].t + stepMinutes * 60_000 });
    rows.push(row);
  });
  return rows;
}

/* ------------------------------------------------------------- a chosen range */

/** How far back sensor summaries go, the same limit as pf_reading_series. */
export const MAX_RANGE_DAYS = 90;

/** Reads the two date fields. Returns the range in milliseconds, or what is wrong with it. */
export function parseCustomRange(fromText: string, toText: string, now: number): { from: number; to: number } | { error: string } {
  const from = new Date(fromText).getTime();
  const to = new Date(toText).getTime();
  if (!fromText || !toText || Number.isNaN(from) || Number.isNaN(to)) return { error: "Fill in both dates and times." };
  if (from >= to) return { error: "The start time must be before the end time." };
  if (from > now) return { error: "The start time cannot be in the future." };
  if (from < now - MAX_RANGE_DAYS * 86_400_000) return { error: `Data available up to ${MAX_RANGE_DAYS} days back.` };
  return { from, to: Math.min(to, now) };
}

/** A moment as a datetime-local field wants it, in the viewer's own clock. */
export function toDateTimeLocal(ms: number) {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

import { check, db, toErpError, unwrap, ErpDataError } from "./foundation";

// Sensor monitoring (supabase/pf-monitoring.sql): devices and their calibration,
// readings, recipe targets and alarms. The ERP only watches: nothing here reaches
// a device. Readings arrive through POST /api/pf/ingest, and every write from these
// pages goes through a database function that checks the caller's role.

/* ------------------------------------------------------------------ metrics */

export const METRICS = [
  { key: "suhu", label: "Suhu", unit: "°C", decimals: 1, kind: "iklim" },
  { key: "rh", label: "Kelembapan", unit: "% RH", decimals: 0, kind: "iklim" },
  { key: "vpd", label: "VPD", unit: "kPa", decimals: 2, kind: "iklim" },
  { key: "co2", label: "CO₂", unit: "ppm", decimals: 0, kind: "iklim" },
  { key: "cahaya", label: "Cahaya", unit: "lux", decimals: 0, kind: "iklim" },
  { key: "ph", label: "pH", unit: "", decimals: 2, kind: "nutrisi" },
  { key: "ec", label: "EC", unit: "mS/cm", decimals: 2, kind: "nutrisi" },
  { key: "do", label: "Oksigen terlarut", unit: "mg/L", decimals: 1, kind: "nutrisi" },
  { key: "suhu_larutan", label: "Suhu larutan", unit: "°C", decimals: 1, kind: "nutrisi" },
] as const;

export type MetricKey = (typeof METRICS)[number]["key"];
export type AssetKind = "iklim" | "nutrisi";

export const metricInfo = (key: string) => METRICS.find((m) => m.key === key) ?? { key, label: key, unit: "", decimals: 2, kind: "iklim" as AssetKind };

export function formatValue(metric: string, value: number) {
  const { decimals } = metricInfo(metric);
  return value.toLocaleString("id-ID", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export const formatWithUnit = (metric: string, value: number) => {
  const { unit } = metricInfo(metric);
  return unit ? `${formatValue(metric, value)} ${unit}` : formatValue(metric, value);
};

/** The two places sensors hang today, by the code in pf_location. */
export const MONITORED_PLACES = [
  { code: "PF01", label: "Plant factory" },
  { code: "CH1", label: "Persemaian" },
] as const;

export type PlaceCode = (typeof MONITORED_PLACES)[number]["code"];

/* -------------------------------------------------------------------- types */

export type LinkState = "online" | "terlambat" | "belum_mengirim" | "perawatan" | "pensiun";

export const LINK_STATES: Record<LinkState, { label: string; dot: string }> = {
  online: { label: "Mengirim", dot: "bg-[#0E9F6E]" },
  terlambat: { label: "Berhenti mengirim", dot: "bg-[#D9433B]" },
  belum_mengirim: { label: "Belum mengirim", dot: "bg-[#E0A526]" },
  perawatan: { label: "Perawatan", dot: "bg-[#8D9398]" },
  pensiun: { label: "Pensiun", dot: "bg-[#8D9398]" },
};

export type Asset = {
  id: string;
  code: string;
  name: string;
  kind: AssetKind;
  model: string;
  serial: string;
  location_id: string;
  location_code: string;
  location_name: string;
  metrics: string[];
  interval_s: number;
  status: "aktif" | "perawatan" | "pensiun";
  last_seen_at: string | null;
  notes: string;
  link_state: LinkState;
  next_due: string | null;
  calibrated: boolean;
};

export type LatestReading = { asset_id: string; asset_code: string; metric: string; location_id: string; location_code: string; ts: string; value: number };

export type AlarmLevel = "peringatan" | "kritis";

export type Alarm = {
  id: string;
  rule_id: string;
  asset_id: string;
  asset_code: string;
  location_code: string;
  metric: string;
  level: AlarmLevel;
  value: number;
  opened_at: string;
  ack_by: string | null;
  ack_at: string | null;
  closed_at: string | null;
  open: boolean;
  warn_low: number | null;
  warn_high: number | null;
  crit_low: number | null;
  crit_high: number | null;
};

export type AlarmRule = {
  id: string;
  location_id: string;
  metric: string;
  warn_low: number | null;
  warn_high: number | null;
  crit_low: number | null;
  crit_high: number | null;
  delay_s: number;
  active: boolean;
};

export type Calibration = { id: string; asset_id: string; metric: string; calibrated_at: string; offset_value: number; slope: number; next_due: string | null; notes: string };

export type RecipeTarget = { id?: string; recipe_id?: string; phase: string; metric: string; low: number | null; target: number | null; high: number | null };

export type SeriesPoint = { t: string; v: number; lo: number; hi: number };
export type Series = { stepMinutes: number; points: SeriesPoint[] };

export type MonitoringSummary = { assets: Asset[]; latest: LatestReading[]; alarms: Alarm[] };

/* -------------------------------------------------------------------- rules */

export type RangeState = "ok" | "rendah" | "tinggi";

/** A reading against a recipe's band. Null when there is no band to read it against. */
export function rangeState(value: number, band: Pick<RecipeTarget, "low" | "high"> | null | undefined): RangeState | null {
  if (!band || (band.low === null && band.high === null)) return null;
  if (band.low !== null && value < band.low) return "rendah";
  if (band.high !== null && value > band.high) return "tinggi";
  return "ok";
}

export const formatBand = (metric: string, band: Pick<RecipeTarget, "low" | "high">) => {
  const { unit } = metricInfo(metric);
  const tail = unit ? ` ${unit}` : "";
  if (band.low !== null && band.high !== null) return `${formatValue(metric, band.low)}–${formatValue(metric, band.high)}${tail}`;
  if (band.low !== null) return `minimal ${formatValue(metric, band.low)}${tail}`;
  if (band.high !== null) return `maksimal ${formatValue(metric, band.high)}${tail}`;
  return "-";
};

/** How long ago, in words, for a reading or an alarm. */
export function ago(iso: string, now: Date = new Date()) {
  const minutes = Math.floor((now.getTime() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return "baru saja";
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  return `${Math.floor(hours / 24)} hari lalu`;
}

/** The newest reading of one metric at one place, whichever device sent it. */
export function latestAt(latest: readonly LatestReading[], place: string, metric: string) {
  return latest.filter((r) => r.location_code === place && r.metric === metric).sort((a, b) => b.ts.localeCompare(a.ts))[0] ?? null;
}

/** A value that stopped being current: older than three of its device's reporting intervals. */
export function isStale(reading: Pick<LatestReading, "ts" | "asset_id">, assets: readonly Pick<Asset, "id" | "interval_s">[], now: Date = new Date()) {
  const interval = assets.find((a) => a.id === reading.asset_id)?.interval_s ?? 300;
  return now.getTime() - new Date(reading.ts).getTime() > interval * 3 * 1000;
}

/** Columns for a strip of readings, so no row ends in a hole: the last cell takes what is left. */
export function stripColumns(count: number) {
  const columns = count <= 5 ? Math.max(count, 1) : count === 6 ? 3 : count <= 8 ? 4 : 5;
  const left = count % columns;
  return { columns, lastSpan: left === 0 ? 1 : columns - left + 1 };
}

/** The metrics devices at this place send, in catalogue order. */
export function metricsAt(assets: readonly Asset[], place: string) {
  const sent = new Set(assets.filter((a) => a.location_code === place && a.status !== "pensiun").flatMap((a) => a.metrics));
  return METRICS.filter((m) => sent.has(m.key)).map((m) => m.key as string);
}

const parseOptional = (s: string) => (s.trim() === "" ? null : Number(s.trim().replace(",", ".")));

export type AssetForm = { code: string; name: string; kind: AssetKind; model: string; serial: string; locationId: string; metrics: string[]; intervalS: string; status: Asset["status"]; notes: string };

export function parseAssetForm(f: AssetForm) {
  if (!f.code.trim()) return { error: "Kode perangkat wajib diisi." } as const;
  if (!/^[A-Za-z0-9-]+$/.test(f.code.trim())) return { error: "Kode hanya boleh huruf, angka, dan tanda hubung." } as const;
  if (!f.name.trim()) return { error: "Nama perangkat wajib diisi." } as const;
  if (!f.locationId) return { error: "Pilih lokasi perangkat." } as const;
  if (f.metrics.length === 0) return { error: "Pilih minimal satu jenis bacaan." } as const;
  const interval = Number(f.intervalS.trim());
  if (!Number.isInteger(interval) || interval <= 0) return { error: "Interval kirim harus bilangan bulat detik di atas 0." } as const;
  return { error: null, interval } as const;
}

export type RuleForm = { warnLow: string; warnHigh: string; critLow: string; critHigh: string; delayMin: string };

export function parseRuleForm(f: RuleForm) {
  const values = [f.warnLow, f.warnHigh, f.critLow, f.critHigh].map(parseOptional);
  if (values.some((v) => v !== null && !Number.isFinite(v))) return { error: "Batas harus berupa angka." } as const;
  if (values.every((v) => v === null)) return { error: "Isi minimal satu batas." } as const;
  const [warnLow, warnHigh, critLow, critHigh] = values;
  const out = (a: number | null, b: number | null) => a !== null && b !== null && a > b;
  if (out(warnLow, warnHigh) || out(critLow, critHigh) || out(critLow, warnLow) || out(warnHigh, critHigh)) {
    return { error: "Batas tidak berurutan: kritis harus di luar peringatan, bawah di bawah atas." } as const;
  }
  const delay = Number((f.delayMin.trim() || "0").replace(",", "."));
  if (!Number.isFinite(delay) || delay < 0) return { error: "Waktu tunggu tidak boleh negatif." } as const;
  return { error: null, warnLow, warnHigh, critLow, critHigh, delayS: Math.round(delay * 60) } as const;
}

export function parseCalibrationForm(offset: string, slope: string) {
  const offsetValue = parseOptional(offset) ?? 0;
  const slopeValue = parseOptional(slope) ?? 1;
  if (!Number.isFinite(offsetValue) || !Number.isFinite(slopeValue)) return { error: "Koreksi dan pengali harus berupa angka." } as const;
  if (slopeValue === 0) return { error: "Faktor pengali tidak boleh nol." } as const;
  return { error: null, offsetValue, slopeValue } as const;
}

export type TargetRow = { metric: string; low: string; target: string; high: string };

export function parseTargetRows(rows: readonly TargetRow[]) {
  const out: { metric: string; low: number | null; target: number | null; high: number | null }[] = [];
  for (const r of rows) {
    const low = parseOptional(r.low);
    const target = parseOptional(r.target);
    const high = parseOptional(r.high);
    if (low === null && target === null && high === null) continue;
    const label = metricInfo(r.metric).label;
    if ([low, target, high].some((v) => v !== null && !Number.isFinite(v))) return { error: `Acuan ${label} harus berupa angka.` } as const;
    if (low !== null && high !== null && low > high) return { error: `Batas bawah ${label} di atas batas atas.` } as const;
    out.push({ metric: r.metric, low, target, high });
  }
  return { error: null, targets: out } as const;
}

/* -------------------------------------------------------------------- chart */

/** Round steps covering the data and the band, for a few faint gridlines. */
export function niceTicks(min: number, max: number, wanted = 4) {
  if (min === max) {
    const pad = Math.abs(min) * 0.05 || 1;
    min -= pad;
    max += pad;
  }
  const rough = (max - min) / wanted;
  const power = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * power).find((s) => s >= rough) ?? 10 * power;
  const first = Math.floor(min / step) * step;
  const ticks: number[] = [];
  for (let v = first; v <= max + step * 0.999; v += step) ticks.push(Number(v.toFixed(6)));
  return ticks;
}

/** A silence in the data stays visible: the line breaks where more than three steps are missing. */
export function splitGaps<T extends { t: string }>(points: readonly T[], stepMinutes: number) {
  const out: T[][] = [];
  const limit = stepMinutes * 3 * 60_000;
  for (const p of points) {
    const run = out[out.length - 1];
    if (run && new Date(p.t).getTime() - new Date(run[run.length - 1].t).getTime() <= limit) run.push(p);
    else out.push([p]);
  }
  return out;
}

/* ------------------------------------------------------------- data access */

const ASSET_COLUMNS = "id,code,name,kind,model,serial,location_id,location_code,location_name,metrics,interval_s,status,last_seen_at,notes,link_state,next_due,calibrated";
const ALARM_COLUMNS = "id,rule_id,asset_id,asset_code,location_code,metric,level,value,opened_at,ack_by,ack_at,closed_at,open,warn_low,warn_high,crit_low,crit_high";

const numbers = <T extends object>(row: T, keys: (keyof T)[]): T => {
  const copy = { ...row };
  for (const k of keys) if (copy[k] !== null && copy[k] !== undefined) (copy[k] as unknown) = Number(copy[k]);
  return copy;
};

const alarmRow = (a: Alarm) => numbers(a, ["value", "warn_low", "warn_high", "crit_low", "crit_high"]);

export async function fetchAssets(): Promise<Asset[]> {
  return unwrap(await db().from("pf_asset_overview").select(ASSET_COLUMNS).order("code").limit(200)) as Asset[];
}

export async function fetchMonitoringSummary(): Promise<MonitoringSummary> {
  const client = db();
  const [assets, latest, alarms] = await Promise.all([
    client.from("pf_asset_overview").select(ASSET_COLUMNS).order("code").limit(200),
    client.from("pf_reading_latest_view").select("asset_id,asset_code,metric,location_id,location_code,ts,value").limit(500),
    client.from("pf_alarm_overview").select(ALARM_COLUMNS).eq("open", true).order("opened_at", { ascending: false }).limit(100),
  ]);
  return {
    assets: unwrap(assets) as Asset[],
    latest: (unwrap(latest) as LatestReading[]).map((r) => numbers(r, ["value"])),
    alarms: (unwrap(alarms) as Alarm[]).map(alarmRow),
  };
}

/** The summary, or null where pf-monitoring.sql has not been run yet. Other failures surface. */
export async function fetchMonitoringIfInstalled(): Promise<MonitoringSummary | null> {
  try {
    return await fetchMonitoringSummary();
  } catch (e) {
    const error = toErpError(e);
    if (error.notInstalled) return null;
    throw error;
  }
}

export async function fetchSeries(place: string, metric: string, hours: number): Promise<Series> {
  return unwrap(await db().rpc("pf_reading_series", { place, metric_key: metric, hours })) as Series;
}

export async function fetchAlarmHistory(): Promise<Alarm[]> {
  const rows = unwrap(await db().from("pf_alarm_overview").select(ALARM_COLUMNS).eq("open", false).order("opened_at", { ascending: false }).limit(50)) as Alarm[];
  return rows.map(alarmRow);
}

export async function fetchAlarmRules(): Promise<AlarmRule[]> {
  const rows = unwrap(await db().from("pf_alarm_rule").select("id,location_id,metric,warn_low,warn_high,crit_low,crit_high,delay_s,active").order("metric").limit(100)) as AlarmRule[];
  return rows.map((r) => numbers(r, ["warn_low", "warn_high", "crit_low", "crit_high"]));
}

export async function fetchCalibrations(asset: string): Promise<Calibration[]> {
  const rows = unwrap(await db().from("pf_calibration").select("id,asset_id,metric,calibrated_at,offset_value,slope,next_due,notes").eq("asset_id", asset).order("calibrated_at", { ascending: false }).limit(50)) as Calibration[];
  return rows.map((c) => numbers(c, ["offset_value", "slope"]));
}

export async function fetchRecipeTargets(recipe: string): Promise<RecipeTarget[]> {
  const rows = unwrap(await db().from("pf_recipe_target").select("id,recipe_id,phase,metric,low,target,high").eq("recipe_id", recipe).limit(200)) as RecipeTarget[];
  return rows.map((t) => numbers(t, ["low", "target", "high"]));
}

export type AssetLocation = { id: string; code: string; name: string };

/** Rooms and chambers: where a device or an alarm rule may be placed. */
export async function fetchAssetLocations(): Promise<AssetLocation[]> {
  return unwrap(await db().from("pf_location").select("id,code,name").in("level", ["room", "chamber"]).order("code")) as AssetLocation[];
}

export async function saveAsset(id: string | null, f: AssetForm, interval: number): Promise<string> {
  return unwrap(await db().rpc("pf_asset_save", {
    asset: id,
    new_code: f.code,
    new_name: f.name,
    new_kind: f.kind,
    new_model: f.model,
    new_serial: f.serial,
    place: f.locationId,
    new_metrics: f.metrics,
    every_s: interval,
    new_status: f.status,
    new_notes: f.notes,
  })) as string;
}

export async function issueToken(asset: string): Promise<string> {
  return unwrap(await db().rpc("pf_asset_issue_token", { asset })) as string;
}

export async function addCalibration(asset: string, metric: string, offset: number, slope: number, due: string, notes: string) {
  check(await db().rpc("pf_calibration_add", { asset, metric_key: metric, new_offset: offset, new_slope: slope, due: due || null, new_notes: notes }));
}

export async function saveAlarmRule(place: string, metric: string, r: { warnLow: number | null; warnHigh: number | null; critLow: number | null; critHigh: number | null; delayS: number }, active: boolean) {
  check(await db().rpc("pf_alarm_rule_save", { place, metric_key: metric, warn_lo: r.warnLow, warn_hi: r.warnHigh, crit_lo: r.critLow, crit_hi: r.critHigh, wait_s: r.delayS, is_active: active }));
}

export async function ackAlarm(alarm: string) {
  check(await db().rpc("pf_alarm_ack", { alarm }));
}

export async function saveRecipeTargets(recipe: string, phase: string, targets: readonly { metric: string; low: number | null; target: number | null; high: number | null }[]) {
  check(await db().rpc("pf_recipe_targets_save", { recipe, phase_key: phase, targets }));
}

export { ErpDataError };

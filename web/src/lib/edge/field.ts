// Field sites: readings an on-site edge PC pushes to /api/edge/ingest, read back for
// /indoor-farming/dashboard/field. Tables and access rules: supabase/edge-sync.sql.
// Unlike the rest of the indoor dashboard (a simulated demo), every number here was
// measured. Row Level Security decides which sites an account sees: lab admins see
// all of them, researchers and partners only the ones a lab admin shared with them.
import { supabase } from "../auth/supabase";

export type EdgeSite = {
  id: string;
  code: string;
  name: string;
  location: string;
  interval_s: number;
  last_seen_at: string | null;
};

export type EdgeDevice = {
  id: string;
  site_id: string;
  source_id: string;
  name: string;
  kind: string;
  zone: string;
  metrics: string[];
  last_seen_at: string | null;
};

export type EdgeLatest = { device_id: string; metric: string; ts: string; value: number };

export type EdgeActuator = {
  id: string;
  site_id: string;
  name: string;
  kind: string;
  zone: string;
  is_on: boolean | null;
  mode: string;
  online: boolean | null;
  changed_at: string | null;
  updated_at: string;
};

export type EdgePoint = { t: string; v: number; lo: number; hi: number };

export type SiteMember = {
  user_id: string;
  email: string;
  full_name: string;
  lab_role: string;
  status: string;
  added_at: string;
};

/* ------------------------------------------------------------------ metrics */

export type MetricMeta = { label: string; unit: string; decimals: number; color: string };

const METRIC_META: Record<string, MetricMeta> = {
  temperature: { label: "Air temperature", unit: "°C", decimals: 1, color: "#E0763C" },
  humidity: { label: "Relative humidity", unit: "%", decimals: 0, color: "#0AA2C0" },
  co2: { label: "CO₂", unit: "ppm", decimals: 0, color: "#7A5AF8" },
  vpd: { label: "VPD", unit: "kPa", decimals: 2, color: "#0B6477" },
  battery: { label: "Battery", unit: "V", decimals: 2, color: "#8A9A9E" },
  water_temp: { label: "Solution temperature", unit: "°C", decimals: 1, color: "#D9534F" },
  ph: { label: "pH", unit: "", decimals: 2, color: "#14919B" },
  ec: { label: "EC", unit: "mS/cm", decimals: 2, color: "#2F855A" },
  do: { label: "Dissolved oxygen", unit: "mg/L", decimals: 1, color: "#3B82F6" },
  pressure: { label: "Air pressure", unit: "hPa", decimals: 1, color: "#6B7280" },
  wind_speed: { label: "Wind speed", unit: "m/s", decimals: 1, color: "#0E9F6E" },
  wind_dir: { label: "Wind direction", unit: "°", decimals: 0, color: "#9CA3AF" },
};

export function metricMeta(metric: string): MetricMeta {
  return METRIC_META[metric] ?? { label: metric.replace(/_/g, " "), unit: "", decimals: 2, color: "#0B6477" };
}

export function formatMetric(metric: string, value: number | null | undefined, withUnit = true): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "–";
  const m = metricMeta(metric);
  const text = value.toFixed(m.decimals);
  return withUnit && m.unit ? `${text} ${m.unit}` : text;
}

export const KIND_LABEL: Record<string, string> = {
  engrow: "Climate sensor (Engrow)",
  nutrigrow: "Nutrient controller (Nutrigrow)",
  aws: "Weather station (AWS)",
  other: "Device",
};

export const MODE_LABEL: Record<string, string> = { auto: "Automatic", manual: "Manual", pause: "Paused" };

/* ------------------------------------------------------------------ freshness */

/** A site counts as offline after three missed pushes. */
export function siteOnline(site: Pick<EdgeSite, "last_seen_at" | "interval_s">, now = Date.now()): boolean {
  if (!site.last_seen_at) return false;
  return now - new Date(site.last_seen_at).getTime() <= Math.max(site.interval_s, 10) * 3 * 1000;
}

/** Readings arrive as closed 10-minute averages, pushed once per window, so the newest one is
    normally 12 to 22 minutes old. A device is stale after 45 minutes without one. */
export const DEVICE_STALE_MS = 45 * 60_000;

export function deviceFresh(lastSeen: string | null, now = Date.now()): boolean {
  return !!lastSeen && now - new Date(lastSeen).getTime() <= DEVICE_STALE_MS;
}

export function ago(iso: string | null, now = Date.now()): string {
  if (!iso) return "never";
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h} h ago`;
  return `${Math.round(h / 24)} days ago`;
}

/* ------------------------------------------------------------------ ranges */

export type RangeKey = "24h" | "7d" | "30d";
export const RANGES: { key: RangeKey; label: string; hours: number }[] = [
  { key: "24h", label: "24 hours", hours: 24 },
  { key: "7d", label: "7 days", hours: 24 * 7 },
  { key: "30d", label: "30 days", hours: 24 * 30 },
];
export const SERIES_POINTS = 300;

/** Bucket size edge_series() uses for a span: never finer than the 10-minute averages. */
export function stepMinutesFor(hours: number, points = SERIES_POINTS): number {
  return Math.max(600, Math.ceil((hours * 3600) / Math.min(Math.max(points, 10), 1000))) / 60;
}

/* ------------------------------------------------------------------ data access */

type Result<T> = { data: T; error: string | null };

const fail = <T,>(data: T, error: string): Result<T> => ({ data, error });

export async function loadSites(): Promise<Result<EdgeSite[]>> {
  if (!supabase) return fail([], "Sign-in is not configured on this deployment.");
  const { data, error } = await supabase
    .from("edge_site")
    .select("id,code,name,location,interval_s,last_seen_at")
    .order("name");
  return { data: (data as EdgeSite[] | null) ?? [], error: error?.message ?? null };
}

export type SiteSnapshot = { devices: EdgeDevice[]; latest: EdgeLatest[]; actuators: EdgeActuator[] };

export async function loadSnapshot(siteId: string): Promise<Result<SiteSnapshot>> {
  const empty: SiteSnapshot = { devices: [], latest: [], actuators: [] };
  if (!supabase) return fail(empty, "Sign-in is not configured on this deployment.");
  const [d, l, a] = await Promise.all([
    supabase.from("edge_device").select("id,site_id,source_id,name,kind,zone,metrics,last_seen_at").eq("site_id", siteId).order("zone").order("name"),
    supabase.from("edge_latest").select("device_id,metric,ts,value").eq("site_id", siteId),
    supabase.from("edge_actuator").select("id,site_id,name,kind,zone,is_on,mode,online,changed_at,updated_at").eq("site_id", siteId).order("zone").order("name"),
  ]);
  const error = d.error?.message ?? l.error?.message ?? a.error?.message ?? null;
  return {
    data: {
      devices: (d.data as EdgeDevice[] | null) ?? [],
      latest: ((l.data as EdgeLatest[] | null) ?? []).map((r) => ({ ...r, value: Number(r.value) })),
      actuators: (a.data as EdgeActuator[] | null) ?? [],
    },
    error,
  };
}

export async function loadSeries(deviceId: string, metric: string, hours: number, now = Date.now()): Promise<Result<EdgePoint[]>> {
  if (!supabase) return fail([], "Sign-in is not configured on this deployment.");
  const { data, error } = await supabase.rpc("edge_series", {
    device: deviceId,
    metric_key: metric,
    from_ts: new Date(now - hours * 3_600_000).toISOString(),
    to_ts: new Date(now).toISOString(),
    points: SERIES_POINTS,
  });
  const rows = (data as { ts: string; value: number; min_value: number; max_value: number }[] | null) ?? [];
  return {
    data: rows.map((r) => ({ t: r.ts, v: Number(r.value), lo: Number(r.min_value), hi: Number(r.max_value) })),
    error: error?.message ?? null,
  };
}

/* ------------------------------------------------------------------ admin */

export async function saveSite(site: { id: string | null; code: string; name: string; location: string; interval_s: number }): Promise<Result<string | null>> {
  if (!supabase) return fail(null, "Sign-in is not configured on this deployment.");
  const { data, error } = await supabase.rpc("edge_admin_save_site", {
    site: site.id,
    site_code: site.code,
    site_name: site.name,
    site_location: site.location,
    push_interval: site.interval_s,
  });
  return { data: (data as string | null) ?? null, error: error?.message ?? null };
}

export async function issueToken(siteId: string): Promise<Result<string | null>> {
  if (!supabase) return fail(null, "Sign-in is not configured on this deployment.");
  const { data, error } = await supabase.rpc("edge_admin_issue_token", { site: siteId });
  return { data: (data as string | null) ?? null, error: error?.message ?? null };
}

export async function loadAccess(siteId: string): Promise<Result<SiteMember[]>> {
  if (!supabase) return fail([], "Sign-in is not configured on this deployment.");
  const { data, error } = await supabase.rpc("edge_admin_site_access", { site: siteId });
  return { data: (data as SiteMember[] | null) ?? [], error: error?.message ?? null };
}

export async function addMember(siteId: string, email: string): Promise<Result<null>> {
  if (!supabase) return fail(null, "Sign-in is not configured on this deployment.");
  const { error } = await supabase.rpc("edge_admin_add_member", { site: siteId, member_email: email });
  return { data: null, error: error?.message ?? null };
}

export async function removeMember(siteId: string, userId: string): Promise<Result<null>> {
  if (!supabase) return fail(null, "Sign-in is not configured on this deployment.");
  const { error } = await supabase.rpc("edge_admin_remove_member", { site: siteId, member: userId });
  return { data: null, error: error?.message ?? null };
}

/** Site codes: lower case letters, digits and dashes, as edge_site checks. */
export function validSiteCode(code: string): boolean {
  return /^[a-z0-9][a-z0-9-]{1,39}$/.test(code.trim().toLowerCase());
}

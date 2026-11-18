// Development without Supabase settings: a clearly labelled sample greenhouse, so the
// field screens can be seen at full density. Only used when import.meta.env.DEV is
// true and sign-in is not configured (components/greenhouse/FieldData.tsx).
import type { EdgePoint, EdgeSite, SiteSnapshot } from "./field";

const iso = (now: number, minutesAgo: number) => new Date(now - minutesAgo * 60_000).toISOString();

export function sampleSites(now: number): EdgeSite[] {
  return [
    { id: "sample-lab", code: "sgh-lab", name: "SGH Lab (sample)", location: "Sample data for development", interval_s: 600, last_seen_at: iso(now, 5) },
    { id: "sample-grabag", code: "sgh-grabag", name: "SGH Grabag (sample)", location: "Grabag, Magelang", interval_s: 600, last_seen_at: iso(now, 48) },
  ];
}

const BASE: Record<string, number> = {
  temperature: 27.3, humidity: 56, co2: 513, vpd: 1.81, battery: 9.34,
  water_temp: 24.6, ph: 6.12, ec: 1.84, wind_speed: 1.9, pressure: 1008.4,
};

export function sampleSnapshot(siteId: string, now: number): SiteSnapshot {
  const devices = [
    { id: `${siteId}-engrow`, site_id: siteId, source_id: "engrow-1", name: "Engrow Lab 1", kind: "engrow", zone: "Bay A", metrics: ["temperature", "humidity", "co2", "vpd", "battery"], last_seen_at: iso(now, 14) },
    { id: `${siteId}-nutri`, site_id: siteId, source_id: "nutrigrow-1", name: "Nutrigrow tank", kind: "nutrigrow", zone: "Bay A", metrics: ["water_temp", "ph", "ec"], last_seen_at: iso(now, 16) },
    { id: `${siteId}-aws`, site_id: siteId, source_id: "aws-1", name: "Rooftop station", kind: "aws", zone: "Outside", metrics: ["temperature", "humidity", "wind_speed", "pressure"], last_seen_at: iso(now, 80) },
  ];
  const latest = devices.flatMap((d) =>
    d.metrics.map((metric) => ({
      device_id: d.id,
      metric,
      ts: d.last_seen_at,
      value: (BASE[metric] ?? 1) * (d.kind === "aws" ? 0.92 : 1),
    })),
  );
  const actuators = [
    { name: "Exhaust fan 1", kind: "exhaust", zone: "Bay A", is_on: true, mode: "auto", online: true, changed: 300 },
    { name: "Misting pump", kind: "pump", zone: "Bay A", is_on: false, mode: "auto", online: true, changed: 45 },
    { name: "Circulation pump", kind: "pump", zone: "Nutrient tank", is_on: true, mode: "manual", online: true, changed: 900 },
    { name: "Shade screen", kind: "screen", zone: "Bay A", is_on: null, mode: "auto", online: false, changed: 2000 },
  ].map((a, i) => ({
    id: `${siteId}-act-${i}`, site_id: siteId, name: a.name, kind: a.kind, zone: a.zone,
    is_on: a.is_on, mode: a.mode, online: a.online, changed_at: iso(now, a.changed), updated_at: iso(now, 5),
  }));
  return { devices, latest, actuators };
}

/** A smooth daily curve around the sample's latest value, bucketed like edge_series(). */
export function sampleSeries(metric: string, hours: number, now: number): EdgePoint[] {
  const base = BASE[metric] ?? 1;
  const n = Math.min(300, Math.max(24, Math.round((hours * 60) / 10)));
  const step = (hours * 3_600_000) / n;
  const out: EdgePoint[] = [];
  for (let i = 0; i < n; i++) {
    const t = now - (n - 1 - i) * step;
    const hour = new Date(t).getUTCHours() + 7;
    const day = Math.sin(((hour - 8) / 24) * 2 * Math.PI);
    const wobble = Math.sin(i * 0.37) * 0.02 + Math.sin(i * 0.11) * 0.03;
    const v = base * (1 + day * 0.08 + wobble);
    out.push({ t: new Date(t).toISOString(), v, lo: v * 0.985, hi: v * 1.015 });
  }
  return out;
}

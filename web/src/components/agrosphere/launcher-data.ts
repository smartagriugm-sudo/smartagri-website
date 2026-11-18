import { useCallback, useEffect, useState } from "react";
import { loadSites, loadSnapshot, metricMeta, siteOnline, type EdgeSite } from "../../lib/edge/field";
import { fetchBatches } from "../../lib/pf/batch";
import { fetchMonitoringIfInstalled } from "../../lib/pf/monitoring";
import type { AgroAccess } from "../../lib/agrosphere";

// The live figures on the launcher's cards, read with the signed-in account's own
// token: a dashboard the account was not given returns nothing here either.

export type Reading = { metric: string; label: string; unit: string; value: number; decimals: number };
export type SiteLive = { site: EdgeSite; online: boolean; readings: Reading[]; sensors: number };
export type PlantFactoryLive = { growing: number; plants: number; alarms: number | null };
export type LauncherData = {
  sites: SiteLive[];
  plantFactory: PlantFactoryLive | null;
  loadedAt: number | null;
  sample: boolean;
};

// The readings a grower looks at first, in this order; the card shows up to three.
const FIRST_METRICS = ["temperature", "humidity", "vpd", "ec", "ph", "co2", "water_temp"];
// Card labels are short so three fit side by side on a phone.
const SHORT_LABEL: Record<string, string> = {
  temperature: "Air temp",
  humidity: "Humidity",
  vpd: "VPD",
  ec: "EC",
  ph: "pH",
  co2: "CO₂",
  water_temp: "Water temp",
};
const REFRESH_MS = 120_000; // edge PCs send 10-minute averages; two minutes shows them soon after

async function siteLive(site: EdgeSite): Promise<SiteLive> {
  const snap = await loadSnapshot(site.id);
  // One figure per metric: the mean of every sensor on the site that reports it.
  const byMetric = new Map<string, number[]>();
  for (const r of snap.data.latest) {
    if (!Number.isFinite(r.value)) continue;
    byMetric.set(r.metric, [...(byMetric.get(r.metric) ?? []), r.value]);
  }
  const readings = FIRST_METRICS.filter((m) => byMetric.has(m))
    .slice(0, 3)
    .map((metric) => {
      const values = byMetric.get(metric)!;
      const meta = metricMeta(metric);
      return {
        metric,
        label: SHORT_LABEL[metric] ?? meta.label,
        unit: meta.unit,
        decimals: meta.decimals,
        value: values.reduce((a, b) => a + b, 0) / values.length,
      };
    });
  return { site, online: siteOnline(site), readings, sensors: snap.data.devices.length };
}

async function plantFactoryLive(): Promise<PlantFactoryLive | null> {
  try {
    const [batches, monitoring] = await Promise.all([fetchBatches(), fetchMonitoringIfInstalled().catch(() => null)]);
    const growing = batches.filter((b) => b.status === "berjalan");
    return {
      growing: growing.length,
      plants: growing.reduce((sum, b) => sum + (b.plants_now || b.trays_now || 0), 0),
      alarms: monitoring ? monitoring.alarms.length : null,
    };
  } catch {
    return null;
  }
}

// Development without Supabase settings: a clearly labelled sample, so the cards can
// be seen at full density. Never shown on a deployment with settings.
function sampleData(): LauncherData {
  const now = new Date().toISOString();
  return {
    sample: true,
    loadedAt: Date.now(),
    plantFactory: { growing: 3, plants: 412, alarms: 1 },
    sites: [
      {
        site: { id: "sample", code: "sgh-grabag", name: "SGH Grabag", location: "Grabag, Magelang", interval_s: 600, last_seen_at: now },
        online: true,
        sensors: 3,
        readings: [
          { metric: "temperature", label: "Air temp", unit: "°C", decimals: 1, value: 27.4 },
          { metric: "humidity", label: "Humidity", unit: "%", decimals: 0, value: 78 },
          { metric: "vpd", label: "VPD", unit: "kPa", decimals: 2, value: 0.81 },
        ],
      },
    ],
  };
}

export function useLauncherData(access: AgroAccess): { data: LauncherData | null; refreshing: boolean; refresh: () => void } {
  const [data, setData] = useState<LauncherData | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick((t) => t + 1), []);

  const wantsSites = access.state === "ready" && access.entries.some((e) => e.app === "greenhouse");
  const wantsPf = access.state === "ready" && access.entries.some((e) => e.app === "plant-factory");

  useEffect(() => {
    if (access.state === "open") {
      setData(import.meta.env.DEV ? sampleData() : { sites: [], plantFactory: null, loadedAt: Date.now(), sample: false });
      return;
    }
    if (access.state !== "ready") return;
    let active = true;
    setRefreshing(true);
    void (async () => {
      const [sites, pf] = await Promise.all([
        wantsSites ? loadSites().then((r) => Promise.all(r.data.map(siteLive))) : Promise.resolve([]),
        wantsPf ? plantFactoryLive() : Promise.resolve(null),
      ]);
      if (!active) return;
      setData({ sites, plantFactory: pf, loadedAt: Date.now(), sample: false });
      setRefreshing(false);
    })();
    return () => {
      active = false;
    };
  }, [access.state, wantsSites, wantsPf, tick]);

  useEffect(() => {
    if (access.state !== "ready") return;
    const t = window.setInterval(refresh, REFRESH_MS);
    return () => window.clearInterval(t);
  }, [access.state, refresh]);

  return { data, refreshing, refresh };
}

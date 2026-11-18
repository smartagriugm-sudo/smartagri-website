import { useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, CircleDot, Loader2, RefreshCw } from "lucide-react";
import { body, display } from "../../lib/fonts";
import { Panel, Pill } from "../dashboard/parts";
import TrendChart from "../erp/TrendChart";
import { mergeSeries } from "../../lib/pf/conditions";
import { niceTicks } from "../../lib/pf/monitoring";
import {
  KIND_LABEL,
  MODE_LABEL,
  RANGES,
  ago,
  deviceFresh,
  formatMetric,
  metricMeta,
  seriesStats,
  siteOnline,
  stepMinutesFor,
  type EdgeActuator,
  type EdgeDevice,
  type EdgePoint,
  type RangeKey,
} from "../../lib/edge/field";
import { useFieldData } from "./FieldData";
import { FIELD_BASE } from "./nav";

export const GOOD = "#0E9F6E";
export const BAD = "#C4342F";
export const WARN = "#B7791F";
export const QUIET = "#8A9A9E";

const TRENDS = `${FIELD_BASE}/trends` as const;

export function Notice({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "bad" }) {
  return (
    <div
      className="rounded-2xl border px-5 py-4 text-[13px] leading-relaxed"
      style={{
        ...body,
        borderColor: tone === "bad" ? "#C4342F33" : "rgba(11,100,119,0.12)",
        backgroundColor: tone === "bad" ? "#C4342F0A" : "#F3F7F6",
        color: tone === "bad" ? "#8F2420" : "#36545B",
      }}
    >
      {children}
    </div>
  );
}

export function Loading({ text = "Loading field data..." }: { text?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-[13px] text-neutral-500" style={body}>
      <Loader2 className="h-4 w-4 animate-spin text-[#0B6477]" /> {text}
    </div>
  );
}

/** Link to the Trends section with a device and metric already chosen. */
export function TrendLink({ device, metric, className, children, title }: { device: string; metric: string; className?: string; children: ReactNode; title?: string }) {
  return (
    <Link to={TRENDS} search={{ site: undefined, device, metric }} className={className} title={title}>
      {children}
    </Link>
  );
}

/* ----------------------------------------------------------- site bar */

// The selected site with its edge PC status, shown above every section, and the
// switcher when the account may read more than one site.
export function SiteBar() {
  const { sites, site, selectSite, now, refresh, refreshing, sample } = useFieldData();
  if (!site) return null;
  const online = siteOnline(site, now);
  return (
    <Panel>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[17px] font-semibold tracking-[-0.025em] text-neutral-900" style={display}>
              {site.name}
            </h2>
            {sample && (
              <span className="rounded-full bg-[#B7791F]/12 px-2 py-0.5 text-[11px] font-medium text-[#8A5A12]" style={body}>
                Sample data
              </span>
            )}
          </div>
          <p className="text-[13px] text-neutral-500" style={body}>
            {site.location || site.code}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium"
            style={{ ...body, color: online ? GOOD : BAD, backgroundColor: online ? "#0E9F6E14" : "#C4342F14" }}
          >
            <CircleDot className="h-3.5 w-3.5" />
            {online ? "Edge PC online" : "Edge PC offline"}
          </span>
          <span className="text-[12px] text-neutral-500" style={body}>
            Last push {ago(site.last_seen_at, now)}
          </span>
          <button
            type="button"
            onClick={refresh}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#0B6477] hover:bg-[#0B6477]/8"
            aria-label="Refresh"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>
      {sites && sites.length > 1 && (
        <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-[#0B6477]/8 pt-3">
          <span className="mr-1 text-[11px] text-neutral-400" style={body}>
            Site
          </span>
          {sites.map((s) => (
            <Pill key={s.id} active={s.id === site.id} onClick={() => selectSite(s.id)}>
              {s.name}
            </Pill>
          ))}
        </div>
      )}
    </Panel>
  );
}

/* ----------------------------------------------------------- tiles */

export function StatTile({ label, value, note, tone }: { label: string; value: ReactNode; note?: ReactNode; tone?: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-[#0B6477]/10 bg-white p-4 shadow-[0_1px_2px_rgba(8,49,58,0.04)]">
      <div className="text-[12px] text-neutral-500" style={body}>
        {label}
      </div>
      <div className="mt-1 text-[22px] font-semibold tracking-[-0.025em] tabular-nums" style={{ ...display, color: tone ?? "#171717" }}>
        {value}
      </div>
      {note && (
        <div className="mt-0.5 truncate text-[12px] text-neutral-500" style={body}>
          {note}
        </div>
      )}
    </div>
  );
}

/** A metric's latest value; opens it in Trends. */
export function ReadingTile({ device, metric, value, caption, stale }: { device: string; metric: string; value: number | undefined; caption?: string; stale?: boolean }) {
  const meta = metricMeta(metric);
  return (
    <TrendLink
      device={device}
      metric={metric}
      title={`${meta.label}: open trend`}
      className="group block rounded-xl border border-[#0B6477]/10 bg-[#FAFCFB] px-3 py-2.5 transition-colors hover:border-[#14919B]/50 hover:bg-white"
    >
      <div className="flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: meta.color }} />
        <span className="truncate text-[11px] text-neutral-500" style={body}>
          {meta.label}
        </span>
        <ArrowUpRight className="ml-auto h-3 w-3 shrink-0 text-neutral-300 transition-colors group-hover:text-[#14919B]" />
      </div>
      <div className="mt-0.5 text-[17px] font-semibold tabular-nums" style={{ ...display, color: stale ? QUIET : "#171717" }}>
        {formatMetric(metric, value)}
      </div>
      {caption && (
        <div className="truncate text-[11px] text-neutral-400" style={body}>
          {caption}
        </div>
      )}
    </TrendLink>
  );
}

export function deviceState(d: EdgeDevice, now: number): { text: string; color: string } {
  if (!d.last_seen_at) return { text: "No data yet", color: QUIET };
  return deviceFresh(d.last_seen_at, now) ? { text: "Reporting", color: GOOD } : { text: `Silent, ${ago(d.last_seen_at, now)}`, color: BAD };
}

export function DeviceCard({ device, latest, now }: { device: EdgeDevice; latest: Map<string, { value: number; ts: string }>; now: number }) {
  const state = deviceState(device, now);
  const stale = !deviceFresh(device.last_seen_at, now);
  return (
    <Panel>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-[14px] font-medium text-neutral-900" style={display}>
            {device.name || device.source_id}
          </div>
          <div className="truncate text-[12px] text-neutral-500" style={body}>
            {KIND_LABEL[device.kind] ?? KIND_LABEL.other}
          </div>
        </div>
        <span
          className="shrink-0 text-[11px] font-medium"
          style={{ ...body, color: state.color }}
          title={device.last_seen_at ? new Date(device.last_seen_at).toLocaleString("en-GB", { timeZone: "Asia/Jakarta" }) : undefined}
        >
          {state.text}
        </span>
      </div>
      {device.metrics.length === 0 ? (
        <p className="text-[12px] text-neutral-500" style={body}>
          This device reports no measured values.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {device.metrics.map((metric) => (
            <ReadingTile key={metric} device={device.id} metric={metric} value={latest.get(`${device.id}:${metric}`)?.value} stale={stale} />
          ))}
        </div>
      )}
    </Panel>
  );
}

/* ----------------------------------------------------------- actuators */

export function ActuatorTable({ actuators, now }: { actuators: EdgeActuator[]; now: number }) {
  if (actuators.length === 0) {
    return (
      <p className="text-[13px] text-neutral-500" style={body}>
        No actuators reported by this site.
      </p>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-collapse text-left">
        <thead>
          <tr className="text-[11px] text-neutral-400">
            <th className="pb-2 pr-3 font-medium" style={body}>Actuator</th>
            <th className="pb-2 pr-3 font-medium" style={body}>Zone</th>
            <th className="pb-2 pr-3 font-medium" style={body}>State</th>
            <th className="pb-2 pr-3 font-medium" style={body}>Mode</th>
            <th className="pb-2 pr-3 font-medium text-right" style={body}>Last change</th>
          </tr>
        </thead>
        <tbody>
          {actuators.map((a) => (
            <tr key={a.id} className="border-t border-[#0B6477]/8 text-[13px]" style={body}>
              <td className="py-2.5 pr-3">
                <div className="font-medium text-neutral-800">{a.name}</div>
                {a.kind && <div className="text-[11px] text-neutral-400">{a.kind}</div>}
              </td>
              <td className="py-2.5 pr-3 text-neutral-600">{a.zone || "–"}</td>
              <td className="py-2.5 pr-3">
                <OnOff on={a.is_on} />
                {a.online === false && <span className="ml-2 text-[11px] text-[#C4342F]">relay offline</span>}
              </td>
              <td className="py-2.5 pr-3" style={{ color: a.mode === "auto" ? "#525252" : WARN }}>
                {MODE_LABEL[a.mode] ?? a.mode}
              </td>
              <td className="py-2.5 pr-3 text-right text-neutral-500">{ago(a.changed_at, now)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function OnOff({ on }: { on: boolean | null }) {
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
      style={{ ...body, color: on ? GOOD : "#4F6B73", backgroundColor: on ? "#0E9F6E14" : "#4F6B7314" }}
    >
      {on === null ? "Unknown" : on ? "On" : "Off"}
    </span>
  );
}

/* ----------------------------------------------------------- series */

export function SeriesChart({
  deviceId,
  deviceName,
  metric,
  range,
  height = 260,
  withStats = false,
}: {
  deviceId: string;
  deviceName: string;
  metric: string;
  range: RangeKey;
  height?: number;
  withStats?: boolean;
}) {
  const { loadSeries } = useFieldData();
  const [points, setPoints] = useState<EdgePoint[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [end, setEnd] = useState(() => Date.now());
  const r = RANGES.find((x) => x.key === range)!;
  const meta = metricMeta(metric);

  useEffect(() => {
    let stop = false;
    setPoints(null);
    const at = Date.now();
    void loadSeries(deviceId, metric, r.hours, at).then((res) => {
      if (stop) return;
      setPoints(res.data);
      setError(res.error);
      setEnd(at);
    });
    return () => {
      stop = true;
    };
  }, [deviceId, metric, r.hours, loadSeries]);

  if (error) {
    return (
      <p className="text-[13px] text-[#C4342F]" style={body}>
        {error}
      </p>
    );
  }
  if (points === null) return <Loading text="Loading readings..." />;
  if (points.length === 0) {
    return (
      <p className="py-10 text-center text-[13px] text-neutral-500" style={body}>
        No readings in this range.
      </p>
    );
  }

  const stats = seriesStats(points)!;
  const yTicks = niceTicks(stats.min, stats.max);
  const step = stepMinutesFor(r.hours);
  const summary = `${meta.label} of ${deviceName}, ${points.length} points over ${r.label}. Latest ${formatMetric(metric, stats.last)}, lowest ${formatMetric(metric, stats.min)}, highest ${formatMetric(metric, stats.max)}.`;

  return (
    <>
      {withStats && (
        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(
            [
              ["Latest", stats.last],
              ["Average", stats.mean],
              ["Lowest", stats.min],
              ["Highest", stats.max],
            ] as const
          ).map(([label, v]) => (
            <div key={label} className="rounded-xl bg-[#F3F7F6] px-3 py-2">
              <div className="text-[11px] text-neutral-500" style={body}>
                {label}
              </div>
              <div className="text-[15px] font-semibold tabular-nums text-neutral-900" style={display}>
                {formatMetric(metric, v)}
              </div>
            </div>
          ))}
        </div>
      )}
      <TrendChart
        lines={[{ key: metric, label: meta.label, color: meta.color, format: (v) => formatMetric(metric, v) }]}
        rows={mergeSeries([{ key: metric, points }], step)}
        from={end - r.hours * 3_600_000}
        to={end}
        height={height}
        yTicks={yTicks}
        formatTick={(v) => formatMetric(metric, v, false)}
        summary={summary}
      />
      <p className="mt-2 text-[11px] text-neutral-400" style={body}>
        Averages of {step < 60 ? `${Math.round(step)} minutes` : `${Math.round(step / 6) / 10} hours`} · times in WIB
      </p>
    </>
  );
}

/** Group devices by zone, keeping the order the snapshot gave them. */
export function byZone<T extends { zone: string }>(items: T[]): [string, T[]][] {
  const groups = new Map<string, T[]>();
  for (const it of items) {
    const z = it.zone || "No zone";
    groups.set(z, [...(groups.get(z) ?? []), it]);
  }
  return [...groups.entries()];
}

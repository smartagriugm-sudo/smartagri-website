import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { CircleDot, Loader2, RefreshCw } from "lucide-react";
import { body, display } from "../lib/fonts";
import { useAuth } from "../lib/auth/auth";
import { DASHBOARD_NAV } from "../lib/indoor-dashboard";
import { Panel, Pill } from "../components/dashboard/parts";
import { ScreenHeading } from "../components/dashboard/AppShell";
import FieldAdmin from "../components/dashboard/FieldAdmin";
import TrendChart from "../components/erp/TrendChart";
import { mergeSeries } from "../lib/pf/conditions";
import { niceTicks } from "../lib/pf/monitoring";
import {
  KIND_LABEL,
  MODE_LABEL,
  RANGES,
  ago,
  deviceFresh,
  formatMetric,
  loadSeries,
  loadSites,
  loadSnapshot,
  metricMeta,
  siteOnline,
  stepMinutesFor,
  type EdgePoint,
  type EdgeSite,
  type RangeKey,
  type SiteSnapshot,
} from "../lib/edge/field";

export const Route = createFileRoute("/indoor-farming_/dashboard/field")({
  component: FieldScreen,
  head: () => ({ meta: [{ title: "Field sites · Dashboard | smartagri" }] }),
});

const NAV = DASHBOARD_NAV.find((n) => n.to === "/indoor-farming/dashboard/field")!;
// New averages arrive once per 10 minutes; checking every 2 minutes shows them soon after.
const REFRESH_MS = 120_000;
const GOOD = "#0E9F6E";
const BAD = "#C4342F";
const QUIET = "#8A9A9E";

// Measured data from the field, pushed by each site's edge PC (see
// supabase/edge-sync.sql). The database decides what an account may read, so this
// screen only reacts to what comes back: no site at all means none is shared yet.
function FieldScreen() {
  const { account, isConfigured } = useAuth();
  const [sites, setSites] = useState<EdgeSite[] | null>(null);
  const [siteId, setSiteId] = useState<string | null>(null);
  const [snap, setSnap] = useState<SiteSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [reloadKey, setReloadKey] = useState(0);

  const active = !account || account.status === "active";

  const refreshSites = useCallback(async () => {
    const r = await loadSites();
    setSites(r.data);
    setError(r.error);
    setSiteId((cur) => (cur && r.data.some((s) => s.id === cur) ? cur : r.data[0]?.id ?? null));
  }, []);

  useEffect(() => {
    if (!isConfigured || !active) return;
    void refreshSites();
  }, [isConfigured, active, refreshSites, reloadKey]);

  // Latest values every minute while the tab is visible.
  useEffect(() => {
    setSnap(null);
    if (!siteId) return;
    let stop = false;
    const tick = async () => {
      if (document.visibilityState !== "visible") return;
      const [r, s] = await Promise.all([loadSnapshot(siteId), loadSites()]);
      if (stop) return;
      setSnap(r.data);
      if (s.error === null) setSites(s.data);
      setError(r.error);
      setNow(Date.now());
    };
    void tick();
    const id = window.setInterval(tick, REFRESH_MS);
    const onVisible = () => void tick();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stop = true;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [siteId, reloadKey]);

  const site = sites?.find((s) => s.id === siteId) ?? null;

  if (!isConfigured) {
    return (
      <>
        <ScreenHeading title={NAV.label} blurb={NAV.blurb} />
        <Notice>Sign-in is not configured on this deployment, so field data cannot be read.</Notice>
      </>
    );
  }
  if (!active) {
    return (
      <>
        <ScreenHeading title={NAV.label} blurb={NAV.blurb} />
        <Notice>
          Your account is waiting for approval by the smartagri team. Once it is approved and a site is shared
          with you, its live data appears here.{" "}
          <Link to="/welcome" search={{ redirect: "/indoor-farming/dashboard/field" }} className="font-medium text-[#0B6477] underline underline-offset-2">
            Check your account
          </Link>
        </Notice>
      </>
    );
  }

  return (
    <>
      <ScreenHeading title={NAV.label} blurb={NAV.blurb} />

      {error && <Notice tone="bad">Could not read field data: {error}</Notice>}

      {sites === null ? (
        <Loading />
      ) : sites.length === 0 ? (
        <Notice>
          No field site is shared with this account yet. Ask a smartagri lab admin to give your account access
          to your site.
        </Notice>
      ) : (
        <>
          {sites.length > 1 && (
            <div className="flex flex-wrap gap-1.5">
              {sites.map((s) => (
                <Pill key={s.id} active={s.id === siteId} onClick={() => setSiteId(s.id)}>
                  {s.name}
                </Pill>
              ))}
            </div>
          )}
          {site && <SiteHeader site={site} now={now} onRefresh={() => setReloadKey((k) => k + 1)} />}
          {site && !snap ? <Loading /> : site && snap ? <SiteBody key={site.id} snap={snap} now={now} /> : null}
        </>
      )}

      {account?.isAdmin && <FieldAdmin sites={sites ?? []} onChanged={() => setReloadKey((k) => k + 1)} />}
    </>
  );
}

function SiteHeader({ site, now, onRefresh }: { site: EdgeSite; now: number; onRefresh: () => void }) {
  const online = siteOnline(site, now);
  return (
    <Panel>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[17px] font-semibold tracking-[-0.025em] text-neutral-900" style={display}>
            {site.name}
          </h2>
          <p className="text-[13px] text-neutral-500" style={body}>
            {site.location || site.code}
          </p>
        </div>
        <div className="flex items-center gap-3">
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
            onClick={onRefresh}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#0B6477] hover:bg-[#0B6477]/8"
            aria-label="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>
    </Panel>
  );
}

function SiteBody({ snap, now }: { snap: SiteSnapshot; now: number }) {
  const latestOf = useMemo(() => {
    const m = new Map<string, { value: number; ts: string }>();
    for (const l of snap.latest) m.set(`${l.device_id}:${l.metric}`, { value: l.value, ts: l.ts });
    return m;
  }, [snap.latest]);

  const first = snap.devices.find((d) => d.metrics.length > 0);
  const [pick, setPick] = useState<{ device: string; metric: string } | null>(
    first ? { device: first.id, metric: first.metrics[0] } : null,
  );
  const picked = snap.devices.find((d) => d.id === pick?.device) ?? null;

  if (snap.devices.length === 0) {
    return <Notice>This site has not sent its device list yet. It appears after the edge PC's first push.</Notice>;
  }

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {snap.devices.map((d) => {
          const fresh = deviceFresh(d.last_seen_at, now);
          return (
            <Panel key={d.id}>
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-[14px] font-medium text-neutral-900" style={display}>
                    {d.name || d.source_id}
                  </div>
                  <div className="truncate text-[12px] text-neutral-500" style={body}>
                    {KIND_LABEL[d.kind] ?? KIND_LABEL.other}
                    {d.zone ? ` · ${d.zone}` : ""}
                  </div>
                </div>
                <span
                  className="shrink-0 text-[11px] font-medium"
                  style={{ ...body, color: d.last_seen_at ? (fresh ? GOOD : BAD) : QUIET }}
                  title={d.last_seen_at ? new Date(d.last_seen_at).toLocaleString("en-GB", { timeZone: "Asia/Jakarta" }) : undefined}
                >
                  {d.last_seen_at ? (fresh ? "Reporting" : `Silent, ${ago(d.last_seen_at, now)}`) : "No data yet"}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {d.metrics.map((metric) => {
                  const meta = metricMeta(metric);
                  const v = latestOf.get(`${d.id}:${metric}`);
                  const on = pick?.device === d.id && pick.metric === metric;
                  return (
                    <button
                      type="button"
                      key={metric}
                      onClick={() => setPick({ device: d.id, metric })}
                      aria-pressed={on}
                      className="rounded-xl border px-3 py-2 text-left transition-colors hover:border-[#14919B]/50"
                      style={{ borderColor: on ? meta.color : "rgba(11,100,119,0.10)", backgroundColor: on ? `${meta.color}0D` : "#FAFCFB" }}
                    >
                      <div className="truncate text-[11px] text-neutral-500" style={body}>
                        {meta.label}
                      </div>
                      <div className="text-[16px] font-semibold tabular-nums text-neutral-900" style={display}>
                        {formatMetric(metric, v?.value)}
                      </div>
                    </button>
                  );
                })}
              </div>
            </Panel>
          );
        })}
      </div>

      {picked && pick && <SeriesPanel deviceId={picked.id} deviceName={picked.name || picked.source_id} metric={pick.metric} />}

      <Panel
        title="Actuators"
        action={
          <span className="text-[11px] text-neutral-400" style={body}>
            State as the edge PC last saw it · read only
          </span>
        }
      >
        {snap.actuators.length === 0 ? (
          <p className="text-[13px] text-neutral-500" style={body}>
            No actuators reported by this site.
          </p>
        ) : (
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
                {snap.actuators.map((a) => (
                  <tr key={a.id} className="border-t border-[#0B6477]/8 text-[13px]" style={body}>
                    <td className="py-2.5 pr-3">
                      <div className="font-medium text-neutral-800">{a.name}</div>
                      {a.kind && <div className="text-[11px] text-neutral-400">{a.kind}</div>}
                    </td>
                    <td className="py-2.5 pr-3 text-neutral-600">{a.zone || "–"}</td>
                    <td className="py-2.5 pr-3">
                      <span
                        className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                        style={{
                          color: a.is_on ? GOOD : "#4F6B73",
                          backgroundColor: a.is_on ? "#0E9F6E14" : "#4F6B7314",
                        }}
                      >
                        {a.is_on === null ? "Unknown" : a.is_on ? "On" : "Off"}
                      </span>
                      {a.online === false && <span className="ml-2 text-[11px] text-[#C4342F]">relay offline</span>}
                    </td>
                    <td className="py-2.5 pr-3 text-neutral-600">{MODE_LABEL[a.mode] ?? a.mode}</td>
                    <td className="py-2.5 pr-3 text-right text-neutral-500">{ago(a.changed_at, now)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}

function SeriesPanel({ deviceId, deviceName, metric }: { deviceId: string; deviceName: string; metric: string }) {
  const [range, setRange] = useState<RangeKey>("24h");
  const [points, setPoints] = useState<EdgePoint[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [end, setEnd] = useState(() => Date.now());
  const hours = RANGES.find((r) => r.key === range)!.hours;
  const meta = metricMeta(metric);

  useEffect(() => {
    let stop = false;
    setPoints(null);
    const at = Date.now();
    void loadSeries(deviceId, metric, hours, at).then((r) => {
      if (stop) return;
      setPoints(r.data);
      setError(r.error);
      setEnd(at);
    });
    return () => {
      stop = true;
    };
  }, [deviceId, metric, hours]);

  const values = points?.map((p) => p.v) ?? [];
  const yTicks = values.length ? niceTicks(Math.min(...values), Math.max(...values)) : [0, 1];
  const step = stepMinutesFor(hours);
  const last = points && points.length ? points[points.length - 1] : null;
  const summary = last
    ? `${meta.label} of ${deviceName}, ${points!.length} points over ${RANGES.find((r) => r.key === range)!.label}. Latest ${formatMetric(metric, last.v)}, lowest ${formatMetric(metric, Math.min(...values))}, highest ${formatMetric(metric, Math.max(...values))}.`
    : `${meta.label} of ${deviceName}: no readings in this range.`;

  return (
    <Panel
      title={`${meta.label} · ${deviceName}`}
      action={
        <div className="flex gap-1.5">
          {RANGES.map((r) => (
            <Pill key={r.key} active={r.key === range} onClick={() => setRange(r.key)}>
              {r.label}
            </Pill>
          ))}
        </div>
      }
    >
      {error ? (
        <p className="text-[13px] text-[#C4342F]" style={body}>
          {error}
        </p>
      ) : points === null ? (
        <Loading />
      ) : points.length === 0 ? (
        <p className="py-10 text-center text-[13px] text-neutral-500" style={body}>
          No readings in this range.
        </p>
      ) : (
        <TrendChart
          lines={[{ key: metric, label: meta.label, color: meta.color, format: (v) => formatMetric(metric, v) }]}
          rows={mergeSeries([{ key: metric, points }], step)}
          from={end - hours * 3_600_000}
          to={end}
          height={260}
          yTicks={yTicks}
          formatTick={(v) => formatMetric(metric, v, false)}
          summary={summary}
        />
      )}
      <p className="mt-2 text-[11px] text-neutral-400" style={body}>
        Averages of {step < 60 ? `${Math.round(step)} minutes` : `${Math.round(step / 6) / 10} hours`} · times in WIB
      </p>
    </Panel>
  );
}

function Notice({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "bad" }) {
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

function Loading() {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-[13px] text-neutral-500" style={body}>
      <Loader2 className="h-4 w-4 animate-spin text-[#0B6477]" /> Loading field data...
    </div>
  );
}

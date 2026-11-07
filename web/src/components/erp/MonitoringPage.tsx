import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { RefreshCw } from "lucide-react";
import { LINK_STATES, MONITORED_PLACES, ago, fetchRecipeTargets, fetchSeries, formatBand, formatValue, formatWithUnit, isStale, latestAt, metricInfo, metricsAt, rangeState, stripColumns, type PlaceCode, type RangeState } from "../../lib/pf/monitoring";
import { useErpStore } from "./ErpContext";
import { DataState, ErpPage, ErrorNote, useLoad } from "./page";
import SensorChart from "./SensorChart";
import { Segmented } from "./ui";

// What the sensors say now, one place at a time. The strip's cells choose which
// metric the chart shows, and the band behind the line is the phase's target from
// the recipe of a batch growing there. Sensors never store a batch: the link is
// the place and the time.

const panel = "rounded-xl border border-[#DCE7E8] bg-white";
const sectionTitle = "text-[16px] font-medium tracking-[-0.02em] text-[#0F2F36]";
const RANGES = [
  { key: 6, label: "6 h" },
  { key: 24, label: "24 h" },
  { key: 168, label: "7 days" },
  { key: 720, label: "30 days" },
];
const REFRESH_MS = 60_000;

const STATE_TEXT: Record<RangeState, { label: string; className: string }> = {
  ok: { label: "On reference", className: "text-[#4F6B73]" },
  rendah: { label: "Below reference", className: "font-medium text-[#8A5A07]" },
  tinggi: { label: "Above reference", className: "font-medium text-[#8A5A07]" },
};

export default function MonitoringPage() {
  const store = useErpStore();
  const [place, setPlace] = useState<PlaceCode>("PF01");
  const [chosenMetric, setChosenMetric] = useState<string | null>(null);
  const [hours, setHours] = useState(24);
  const [chosenBatch, setChosenBatch] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const summary = store.monitoring;
  const metrics = summary ? metricsAt(summary.assets, place) : [];
  const metric = chosenMetric && metrics.includes(chosenMetric) ? chosenMetric : metrics[0] ?? null;
  const placeId = store.locationIds.get(place);

  // Which batches grow here now, for the band behind the line.
  const here = [...store.batches.values()].filter((b) => (place === "CH1" ? store.traysOfBatch(b.code).length > 0 : store.holesOfBatch(b.code).length > 0));
  const batch = here.find((b) => b.code === chosenBatch) ?? here[0] ?? null;

  const targets = useLoad(async () => (batch?.recipeId ? fetchRecipeTargets(batch.recipeId) : []), [batch?.recipeId]);
  const targetOf = (key: string) => targets.data?.find((t) => t.phase === batch?.phaseKey && t.metric === key) ?? null;

  const series = useLoad(async () => (placeId && metric ? fetchSeries(placeId, metric, hours) : null), [placeId, metric, hours]);

  const reloadSeries = series.reload;
  useEffect(() => {
    const t = window.setInterval(() => {
      void store.loadMonitoring();
      void reloadSeries();
    }, REFRESH_MS);
    return () => window.clearInterval(t);
  }, [store, reloadSeries]);

  const refresh = async () => {
    setRefreshing(true);
    await Promise.all([store.loadMonitoring(), series.reload()]);
    setRefreshing(false);
  };

  if (store.mode === "sample" || (store.hasData && !summary && !store.monitoringError)) {
    return (
      <ErpPage eyebrow="Monitoring" title="Conditions">
        <div className={`${panel} p-5`}>
          <p className="text-[15px] font-medium text-[#0F2F36]">Sensor tables are not installed yet</p>
          <p className="mt-1 text-[14px] leading-[1.5] text-[#4F6B73]">Run <code className="rounded bg-[#EEF3F4] px-1">web/supabase/pf-monitoring.sql</code> in the Supabase SQL Editor, then reload this page.</p>
        </div>
      </ErpPage>
    );
  }

  const placeAssets = summary?.assets.filter((a) => a.location_code === place && a.status !== "pensiun") ?? [];
  const placeAlarms = summary?.alarms.filter((a) => a.location_code === place) ?? [];
  const silent = placeAssets.filter((a) => a.link_state === "terlambat");
  const label = MONITORED_PLACES.find((p) => p.code === place)?.label ?? place;

  const finding = !summary
    ? undefined
    : placeAssets.length === 0
      ? `No devices yet at ${label.toLowerCase()}.`
      : placeAlarms.length > 0
        ? `${placeAlarms.length} open alarms at ${label.toLowerCase()}: ${metricInfo(placeAlarms[0].metric).label} ${formatWithUnit(placeAlarms[0].metric, placeAlarms[0].value)}.`
        : silent.length > 0
          ? `${silent[0].code} stopped sending since ${silent[0].last_seen_at ? ago(silent[0].last_seen_at) : "a while ago"}.`
          : `No open alarms at ${label.toLowerCase()}.`;

  const band = metric ? targetOf(metric) : null;

  return (
    <ErpPage
      eyebrow="Monitoring"
      title="Conditions"
      sub={finding}
      actions={
        <button type="button" disabled={refreshing} onClick={() => void refresh()} aria-label="Reload readings" className="grid h-11 w-11 place-items-center rounded-lg text-[#36525A] hover:bg-white disabled:opacity-50 sm:h-8 sm:w-8">
          <RefreshCw className={`h-4 w-4 ${refreshing ? "motion-safe:animate-spin" : ""}`} />
        </button>
      }
    >
      <div className="space-y-4">
        {store.monitoringError && <ErrorNote message={store.monitoringError} onRetry={() => store.loadMonitoring()} />}
        <Segmented value={place} options={MONITORED_PLACES.map((p) => ({ key: p.code, label: p.label }))} onChange={setPlace} />

        {summary && metrics.length === 0 ? (
          <div className={`${panel} px-4 py-8 text-center text-[14px] text-[#4F6B73]`}>
            No device is sending from {label.toLowerCase()}. <Link to="/erp/devices" className="font-medium text-[#0B6477] hover:underline">Register device</Link>
          </div>
        ) : summary ? (
          <>
            {/* One container split by hairlines: each cell is a reading and the chart's choice. */}
            <div
              className={`${panel} grid grid-cols-2 overflow-hidden md:[grid-template-columns:repeat(var(--columns),minmax(0,1fr))]`}
              style={{ "--columns": stripColumns(metrics.length).columns } as React.CSSProperties}
              role="group"
              aria-label="Choose a reading"
            >
              {metrics.map((key, i) => {
                const info = metricInfo(key);
                const reading = latestAt(summary.latest, place, key);
                // An old value is not read against the band: it says how old it is instead.
                const stale = !!reading && isStale(reading, summary.assets);
                const state = reading && !stale ? rangeState(reading.value, targetOf(key)) : null;
                const on = key === metric;
                const last = i === metrics.length - 1;
                return (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setChosenMetric(key)}
                    style={last ? ({ "--last": stripColumns(metrics.length).lastSpan } as React.CSSProperties) : undefined}
                    className={`min-h-[44px] border-b border-r border-[#EDF2F2] px-4 py-2.5 text-left hover:bg-[#F6F8F8] ${last && metrics.length % 2 ? "col-span-2" : ""} ${last ? "md:[grid-column:span_var(--last)/span_var(--last)]" : ""} ${on ? "bg-[#F1F8F8] shadow-[inset_0_-2px_0_#14919B]" : ""}`}
                  >
                    <span className="block text-[13px] font-medium text-[#4F6B73]">{info.label}</span>
                    <span className="block text-[#0F2F36]">
                      <span className="text-[24px] font-semibold leading-tight tabular-nums tracking-[-0.02em]">{reading ? formatValue(key, reading.value) : "-"}</span>
                      {info.unit && <span className="ml-1 text-[13px] text-[#4F6B73]">{info.unit}</span>}
                    </span>
                    <span className={`block text-[12.5px] ${stale ? "font-medium text-[#8A5A07]" : state ? STATE_TEXT[state].className : "text-[#4F6B73]"}`}>
                      {stale ? `Last ${ago(reading.ts)}` : state ? STATE_TEXT[state].label : reading ? ago(reading.ts) : "No readings yet"}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
              <section className={`${panel} min-w-0 p-4`} aria-labelledby="chart-title">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                  <h2 id="chart-title" className={sectionTitle}>{metric ? metricInfo(metric).label : "Chart"}</h2>
                  <Segmented value={hours} options={RANGES} onChange={setHours} />
                </div>
                {here.length > 0 && (
                  <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-[#4F6B73]">
                    <label className="flex items-center gap-2">
                      Reference from
                      <select value={batch?.code ?? ""} onChange={(e) => setChosenBatch(e.target.value)} className="min-h-[44px] rounded-lg border border-[#C9D8DA] bg-white px-2 text-[16px] text-[#0F2F36] sm:min-h-[28px] sm:text-[13px]">
                        {here.map((b) => <option key={b.code} value={b.code}>{b.code} · {b.crop}</option>)}
                      </select>
                    </label>
                    <span>{band ? formatBand(band.metric, band) : "This batch's recipe has no reference for this reading yet."}</span>
                  </div>
                )}
                {series.error && !series.error.notInstalled ? (
                  <ErrorNote message={series.error.message} onRetry={series.reload} />
                ) : metric ? (
                  <SensorChart metric={metric} points={series.data?.points ?? []} stepMinutes={series.data?.stepMinutes ?? 5} hours={hours} band={band} />
                ) : null}
              </section>

              <div className="min-w-0 space-y-4">
                <section className={panel} aria-labelledby="open-alarms">
                  <div className="flex items-baseline justify-between gap-3 px-4 py-3">
                    <h2 id="open-alarms" className={sectionTitle}>Open alarms <span className="tabular-nums text-[#4F6B73]">{placeAlarms.length}</span></h2>
                    <Link to="/erp/alarms" className="inline-flex min-h-[44px] items-center text-[13px] font-medium text-[#0B6477] hover:underline sm:min-h-0">Manage</Link>
                  </div>
                  {placeAlarms.length === 0 ? (
                    <p className="border-t border-[#EDF2F2] px-4 py-3 text-[14px] text-[#4F6B73]">No open alarms.</p>
                  ) : (
                    <ul>
                      {placeAlarms.slice(0, 4).map((a) => (
                        <li key={a.id} className="border-t border-[#EDF2F2] px-4 py-2.5 text-[14px]">
                          <span className="font-medium text-[#0F2F36]">{metricInfo(a.metric).label} {formatWithUnit(a.metric, a.value)}</span>
                          <span className={`ml-2 rounded-md px-1.5 py-0.5 text-[12.5px] font-medium ${a.level === "kritis" ? "bg-[#FDECEA] text-[#B3362C]" : "bg-[#FFF6E5] text-[#8A5A07]"}`}>{a.level === "kritis" ? "Critical" : "Warning"}</span>
                          <span className="block text-[13px] text-[#4F6B73]">{a.asset_code} · {ago(a.opened_at)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <section className={panel} aria-labelledby="place-devices">
                  <div className="flex items-baseline justify-between gap-3 px-4 py-3">
                    <h2 id="place-devices" className={sectionTitle}>Devices</h2>
                    <Link to="/erp/devices" className="inline-flex min-h-[44px] items-center text-[13px] font-medium text-[#0B6477] hover:underline sm:min-h-0">Manage</Link>
                  </div>
                  <ul>
                    {placeAssets.map((a) => (
                      <li key={a.id} className="flex items-center justify-between gap-3 border-t border-[#EDF2F2] px-4 py-2.5 text-[14px]">
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-[#0F2F36]">{a.code}</span>
                          <span className="block truncate text-[13px] text-[#4F6B73]">{a.last_seen_at ? `Last ${ago(a.last_seen_at)}` : "Has never sent"}</span>
                        </span>
                        <span className="flex shrink-0 items-center gap-1.5 text-[13px] text-[#36525A]"><span className={`h-2 w-2 rounded-full ${LINK_STATES[a.link_state].dot}`} />{LINK_STATES[a.link_state].label}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              </div>
            </div>
          </>
        ) : (
          <DataState state={{ data: null, error: null, loading: true, reload: async () => {} }}>{() => null}</DataState>
        )}
      </div>
    </ErpPage>
  );
}
